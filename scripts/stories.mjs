// Builds 상식플러스 audio stories: voices each paragraph of content/stories/*.mjs with Gemini TTS
// (voice "Aoede", the app's "arin"), joins them into one MP3 per story, and writes
// public/data/stories.json with the text, paragraph timings and audio file names.
//
//   node scripts/stories.mjs            build everything that changed
//   node scripts/stories.mjs <id>       rebuild one story
//   node scripts/stories.mjs --sample   voice one sentence to check the key and speaking speed
//
// The API key is read from GEMINI_API_KEY, .env.local, or ../agent/.env and never written anywhere.
// Audio goes to .stories/audio (git-ignored) and is published to the `stories` branch, so the
// app downloads it on first play instead of carrying it inside the APK.
import { Mp3Encoder } from '@breezystack/lamejs'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const OUT = join(ROOT, '.stories')
const AUDIO = join(OUT, 'audio')
const MODELS = ['gemini-3.8-flash-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-pro-preview-tts']
const VOICE = 'Aoede'
const RATE = 24000
/** Silence between paragraphs, in seconds. */
const GAP = 0.45

function apiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY
  for (const file of [join(ROOT, '.env.local'), join(ROOT, '..', 'agent', '.env')]) {
    if (!existsSync(file)) continue
    const m = readFileSync(file, 'utf8').match(/^GEMINI_API_KEY\s*=\s*"?([^"\r\n]+)"?/m)
    if (m) return m[1]
  }
  throw new Error('GEMINI_API_KEY를 찾지 못했어요')
}

const KEY = apiKey()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Returns 16-bit mono PCM samples for one paragraph. */
async function speak(text) {
  let lastError = ''
  for (let attempt = 0; attempt < 4; attempt++) {
    for (const model of MODELS) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
          },
        }),
        signal: AbortSignal.timeout(180_000),
      }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }))
      if (res.ok) {
        const data = await res.json()
        const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData
        if (part) return decode(Buffer.from(part.data, 'base64'), part.mimeType ?? '')
        lastError = `${model}: 오디오 없음 ${JSON.stringify(data).slice(0, 200)}`
      } else {
        lastError = `${model}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`
      }
    }
    await sleep(3000 * (attempt + 1))
  }
  throw new Error(lastError)
}

/**
 * The API answers with either raw 16-bit PCM or a whole WAV file. Treating a WAV header as samples
 * put a loud click at the start of every paragraph, so WAVs are parsed down to their data chunk.
 */
function decode(buf, mime) {
  let rate = Number(/rate=(\d+)/.exec(mime)?.[1] ?? RATE)
  let data = buf
  if (buf.toString('ascii', 0, 4) === 'RIFF') {
    let o = 12
    data = null
    while (o + 8 <= buf.length) {
      const id = buf.toString('ascii', o, o + 4)
      const size = buf.readUInt32LE(o + 4)
      if (id === 'fmt ') {
        rate = buf.readUInt32LE(o + 12)
        if (buf.readUInt16LE(o + 10) !== 1 || buf.readUInt16LE(o + 22) !== 16) throw new Error('모노 16비트 WAV가 아니에요')
      }
      if (id === 'data') {
        data = buf.subarray(o + 8, Math.min(buf.length, o + 8 + size))
        break
      }
      o += 8 + size + (size % 2)
    }
    if (!data) throw new Error('WAV에 data 청크가 없어요')
  }
  if (rate !== RATE) throw new Error(`예상과 다른 샘플레이트 ${rate}`)
  const copy = Buffer.from(data.subarray(0, data.length - (data.length % 2)))
  return new Int16Array(copy.buffer, copy.byteOffset, copy.length / 2)
}

/** Lowers the level a little (the voice peaks at full scale) and fades the edges to avoid clicks. */
function polish(pcm) {
  const out = new Int16Array(pcm.length)
  const fade = Math.max(1, Math.min(Math.round(RATE * 0.012), Math.floor(pcm.length / 2)))
  for (let i = 0; i < pcm.length; i++) {
    const edge = Math.min(1, i / fade, (pcm.length - 1 - i) / fade)
    out[i] = Math.round(pcm[i] * 0.88 * edge)
  }
  return out
}

function toMp3(pcm) {
  const enc = new Mp3Encoder(1, RATE, 64)
  const chunks = []
  for (let i = 0; i < pcm.length; i += 1152) {
    const buf = enc.encodeBuffer(pcm.subarray(i, i + 1152))
    if (buf.length) chunks.push(Buffer.from(buf))
  }
  chunks.push(Buffer.from(enc.flush()))
  return Buffer.concat(chunks)
}

/** Trims leading/trailing near-silence so paragraph gaps stay even. */
function trim(pcm) {
  const limit = 300
  let a = 0
  let b = pcm.length
  while (a < b && Math.abs(pcm[a]) < limit) a++
  while (b > a && Math.abs(pcm[b - 1]) < limit) b--
  return pcm.subarray(Math.max(0, a - RATE * 0.05), Math.min(pcm.length, b + RATE * 0.1))
}

async function loadStories() {
  const dir = join(ROOT, 'content', 'stories')
  const stories = []
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort()) {
    const mod = (await import(pathToFileURL(join(dir, file)).href)).default
    stories.push(...mod)
  }
  return stories
}

async function build(story, cache) {
  const hash = createHash('sha1').update(VOICE + 'v2' + JSON.stringify(story.paragraphs)).digest('hex').slice(0, 12)
  const file = `${story.id}-${hash}.mp3`
  if (cache[story.id]?.file === file && existsSync(join(AUDIO, file))) return cache[story.id]

  const parts = []
  const starts = []
  let samples = 0
  for (const [i, text] of story.paragraphs.entries()) {
    process.stdout.write(`  ${story.id} ${i + 1}/${story.paragraphs.length}\r`)
    const pcm = polish(trim(await speak(text)))
    starts.push(+(samples / RATE).toFixed(2))
    parts.push(pcm)
    samples += pcm.length
    const gap = new Int16Array(Math.round(RATE * GAP))
    parts.push(gap)
    samples += gap.length
  }
  const all = new Int16Array(samples)
  let o = 0
  for (const p of parts) {
    all.set(p, o)
    o += p.length
  }
  writeFileSync(join(AUDIO, file), toMp3(all))
  const entry = { file, duration: Math.round(samples / RATE), starts }
  console.log(`  ${story.id}: ${entry.duration}초, ${story.paragraphs.join('').length}자`)
  return entry
}

mkdirSync(AUDIO, { recursive: true })

if (process.argv[2] === '--sample') {
  const text = '안녕하세요, 상식플러스예요. 오늘은 삼국지에서 가장 유명한 장면, 도원결의 이야기를 들려드릴게요.'
  const pcm = polish(trim(await speak(text)))
  writeFileSync(join(OUT, 'sample.mp3'), toMp3(pcm))
  const sec = pcm.length / RATE
  console.log(`${sec.toFixed(1)}초, ${text.replace(/\s/g, '').length}글자 → 초당 ${(text.replace(/\s/g, '').length / sec).toFixed(2)}글자`)
  process.exit(0)
}

const only = process.argv[2]
const cachePath = join(OUT, 'cache.json')
const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {}
const stories = await loadStories()
const out = []
for (const story of stories) {
  if (only && story.id !== only) {
    if (cache[story.id]) out.push({ ...story, ...cache[story.id] })
    continue
  }
  if (only && story.id === only) delete cache[story.id]
  const entry = await build(story, cache)
  cache[story.id] = entry
  writeFileSync(cachePath, JSON.stringify(cache, null, 2))
  out.push({ ...story, ...entry })
}
writeFileSync(
  join(ROOT, 'public', 'data', 'stories.json'),
  JSON.stringify({ version: 1, voice: 'arin', stories: out }, null, 1) + '\n',
)
console.log(`✓ 이야기 ${out.length}편, 총 ${Math.round(out.reduce((s, x) => s + x.duration, 0) / 60)}분`)
