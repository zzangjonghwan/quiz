// Builds 상식플러스 audio stories: voices each paragraph of content/stories/*.mjs with Gemini TTS or
// Fish S2 (on this PC) in the app's voices (moa, the default, arin and doyoung), joins them into one MP3 per
// story and voice, and writes public/data/stories.json with the text, paragraph timings and audio file names.
//
//   node scripts/stories.mjs                      build everything missing or changed
//   node scripts/stories.mjs <id> ...             only these stories
//   node scripts/stories.mjs --voice=moa          only these voices
//   node scripts/stories.mjs <id> --force         voice again even if the text is unchanged
//   node scripts/stories.mjs --dry                which takes are missing, without voicing them
//   node scripts/stories.mjs --samples            the short preview clips in public/voices (--voice= works too)
//
// API keys (GEMINI_API_KEY, FISH_AUDIO_API_KEY) are read from the environment, .env.local, or
// ../agent/.env and never written anywhere.
// Audio goes to .stories/audio (git-ignored) and is published to the `stories` branch, so the
// app downloads it on first play instead of carrying it inside the APK.
import { Mp3Encoder } from '@breezystack/lamejs'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const OUT = join(ROOT, '.stories')
const AUDIO = join(OUT, 'audio')
/**
 * The app's voices (설정 > 목소리) and the engine, voice and model behind each. New takes use `model`;
 * stories already voiced on an older model (`kept`) stay as they are instead of being redone.
 */
const VOICES = {
  arin: { name: 'Aoede', model: 'gemini-3.8-flash-tts', kept: [] },
  // New takes come from Fish S2 Pro cloning a 25s Gemini Leda clip; the Gemini takes stay.
  moa: { ...localFish('moa'), kept: ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'], keptName: 'Leda' },
  doyoung: { ...localFish('doyoung'), kept: [] },
}

/**
 * Fish S2 Pro on this PC (C:\tts\fish-speech, see PLAN.md). `name` is the folder under its
 * references/ holding the voice sample; `style` names the script() rules and is part of the file
 * name, so changing the rules means bumping it.
 */
function localFish(name) {
  return {
    provider: 'fish',
    url: 'http://127.0.0.1:8880',
    name,
    model: 's2-pro',
    style: 'lively-2',
    script: lively,
    sampling: { temperature: 0.9, top_p: 0.9, chunk_length: 300 },
    rate: 44100,
    kbps: 128,
    parallel: 1,
    // Paragraphs are voiced apart, so the break between them is all added silence.
    gap: 0.8,
  }
}

/**
 * Stage directions for Fish S2, which reads [bracketed] cues as how to say the next words: a lively
 * tone for each paragraph, a breath after long sentences, extra feeling on the hook lines that pull
 * the story along, and stress on intensifiers. Short tag-on lines like "참 재밌죠!" sounded forced
 * and are left out of the take (the app still shows them).
 */
function lively(paragraph) {
  const filler = /^(참|꽤|많이|정말)?\s*(재밌|놀랍|의외)죠[!?.]$/
  // A sentence can end inside quotes: …손전등이야.’ 재밌죠!
  const sentences = paragraph.split(/(?<=[.?!][’”'"]?)\s+/).filter((s) => !filler.test(s))
  const lines = sentences.map((s, i) => {
    // A beat between sentences; after a long one, a breath instead.
    let cue = !i ? '' : sentences[i - 1].length >= 30 ? '[inhale] ' : '[short pause] '
    if (/^여기서 반전/.test(s)) cue = '[inhale] [깜짝 놀란 듯 신나게] '
    else if (s.endsWith('?')) cue += '[궁금증을 자극하듯 끝을 올려서] '
    else if (s.endsWith('!')) cue += '[생기 있게 힘주어] '
    return cue + s.replace(/(^|\s)(아주|정말|진짜|엄청|무척|굉장히|훨씬|완전히)(?=\s)/g, '$1[emphasis] $2')
  })
  return `[생기 있고 높낮이가 큰 이야기 말투] ${lines.join(' ')}`
}
/** Listens to a finished take and reports where each paragraph starts (see align()). */
const ALIGN_MODEL = 'gemini-3.6-flash'
/** Sample rate of the Gemini voices; a voice with its own `rate` (and `kbps`) is kept at that quality. */
const RATE = 24000
const rateOf = (voice) => VOICES[voice].rate ?? RATE
/** Stories voiced at the same time per voice (each voice also runs in parallel). */
const PARALLEL = 2
/** Extra silence added at each paragraph break, on top of the reader's own pause, in seconds. */
const GAP = 0.35

function apiKey(name) {
  if (process.env[name]) return process.env[name]
  for (const file of [join(ROOT, '.env.local'), join(ROOT, '..', 'agent', '.env')]) {
    if (!existsSync(file)) continue
    const m = readFileSync(file, 'utf8').match(new RegExp(`^${name}\\s*=\\s*"?([^"\\r\\n]+)"?`, 'm'))
    if (m) return m[1]
  }
  throw new Error(`${name}를 찾지 못했어요`)
}

const KEY = apiKey('GEMINI_API_KEY')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Returns 16-bit mono PCM samples for the text. */
async function speak(text, voice) {
  if (VOICES[voice].provider === 'fish') return speakFish(text, voice)
  const { name, model } = VOICES[voice]
  let lastError = ''
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: name } } },
        },
      }),
      signal: AbortSignal.timeout(300_000),
    }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }))
    if (res.ok) {
      const data = await res.json()
      const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData
      if (part) return decode(Buffer.from(part.data, 'base64'), part.mimeType ?? '')
      lastError = `${model}: 오디오 없음 ${JSON.stringify(data).slice(0, 200)}`
    } else {
      const body = await res.text()
      // The TTS models allow about 100 requests a day; no point retrying until tomorrow.
      if (res.status === 429 && body.includes('per_day')) throw Object.assign(new Error(`${model}: 오늘 한도를 다 썼어요`), { daily: true })
      lastError = `${model}: HTTP ${res.status} ${body.slice(0, 200)}`
    }
    // Rate limits (429) clear within a minute; back off further each round.
    await sleep(Math.min(60_000, 5000 * (attempt + 1)))
  }
  throw new Error(lastError)
}

/**
 * Fish Audio TTS. Without `url` it is the cloud API, billed per character from the API credit at
 * fish.audio/app/developers (separate from the website's own credit), answering with raw PCM.
 * With `url` it is a fish-speech server on this PC (same /v1/tts, free), answering with a WAV at
 * the model's own rate, which ffmpeg converts to the voice's rate.
 */
async function speakFish(text, voice) {
  const { name, model, url, sampling } = VOICES[voice]
  let lastError = ''
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${url ?? 'https://api.fish.audio'}/v1/tts`, {
      method: 'POST',
      headers: url
        ? { 'content-type': 'application/json' }
        : { authorization: `Bearer ${apiKey('FISH_AUDIO_API_KEY')}`, 'content-type': 'application/json', model },
      body: JSON.stringify(
        url
          ? { text, reference_id: name, format: 'wav', language: 'ko', ...sampling }
          : { text, reference_id: name, format: 'pcm', sample_rate: RATE },
      ),
      // A whole story on a home GPU takes several minutes.
      signal: AbortSignal.timeout(url ? 3_600_000 : 300_000),
    }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }))
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer())
      return url ? decode(resample(buf, rateOf(voice)), `rate=${rateOf(voice)}`, rateOf(voice)) : decode(buf, `rate=${RATE}`)
    }
    const body = await res.text()
    // Out of API credit: retrying won't help until it is topped up.
    if (res.status === 402) throw Object.assign(new Error(`${model}: Fish Audio API 크레딧이 부족해요`), { daily: true })
    lastError = `${model}: HTTP ${res.status} ${body.slice(0, 200)}`
    await sleep(5000 * (attempt + 1))
  }
  throw new Error(lastError)
}

/** Any audio file → raw 16-bit mono PCM at `rate` (ffmpeg on PATH, or the FFMPEG env var). */
function resample(buf, rate) {
  const r = spawnSync(
    process.env.FFMPEG ?? 'ffmpeg',
    ['-loglevel', 'error', '-i', 'pipe:0', '-af', 'aresample=resampler=soxr', '-ac', '1', '-ar', String(rate), '-f', 's16le', 'pipe:1'],
    { input: buf, maxBuffer: 1 << 30 },
  )
  if (r.status !== 0) throw new Error(`ffmpeg: ${r.error?.message ?? r.stderr}`)
  return r.stdout
}

/**
 * The API answers with either raw 16-bit PCM or a whole WAV file. Treating a WAV header as samples
 * put a loud click at the start of every paragraph, so WAVs are parsed down to their data chunk.
 */
function decode(buf, mime, expected = RATE) {
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
  if (rate !== expected) throw new Error(`예상과 다른 샘플레이트 ${rate}`)
  const copy = Buffer.from(data.subarray(0, data.length - (data.length % 2)))
  return new Int16Array(copy.buffer, copy.byteOffset, copy.length / 2)
}

/** Lowers the level a little (the voice peaks at full scale) and fades the edges to avoid clicks. */
function polish(pcm, rate) {
  const out = new Int16Array(pcm.length)
  const fade = Math.max(1, Math.min(Math.round(rate * 0.012), Math.floor(pcm.length / 2)))
  for (let i = 0; i < pcm.length; i++) {
    const edge = Math.min(1, i / fade, (pcm.length - 1 - i) / fade)
    out[i] = Math.round(pcm[i] * 0.88 * edge)
  }
  return out
}

function toMp3(pcm, rate, kbps = 64) {
  const enc = new Mp3Encoder(1, rate, kbps)
  const chunks = []
  for (let i = 0; i < pcm.length; i += 1152) {
    const buf = enc.encodeBuffer(pcm.subarray(i, i + 1152))
    if (buf.length) chunks.push(Buffer.from(buf))
  }
  chunks.push(Buffer.from(enc.flush()))
  return Buffer.concat(chunks)
}

/** Trims leading/trailing near-silence so paragraph gaps stay even. */
function trim(pcm, rate) {
  const limit = 300
  let a = 0
  let b = pcm.length
  while (a < b && Math.abs(pcm[a]) < limit) a++
  while (b > a && Math.abs(pcm[b - 1]) < limit) b--
  return pcm.subarray(Math.max(0, a - rate * 0.05), Math.min(pcm.length, b + rate * 0.1))
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

/** File name for a story in one voice. arin keeps the original naming so existing audio is reused. */
function fileFor(story, voice, model = VOICES[voice].model) {
  // Kept takes were made on another engine, under that engine's voice name and without a style.
  const current = model === VOICES[voice].model
  const name = current ? VOICES[voice].name : (VOICES[voice].keptName ?? VOICES[voice].name)
  const style = current && VOICES[voice].style ? `:${VOICES[voice].style}` : ''
  const seed = voice === 'arin' ? name : `${voice}:${name}:${model}${style}`
  const hash = createHash('sha1').update(seed + 'v2' + JSON.stringify(story.paragraphs)).digest('hex').slice(0, 12)
  return voice === 'arin' ? `${story.id}-${hash}.mp3` : `${story.id}-${voice}-${hash}.mp3`
}

/** Whether a cached take is still current: same text, recorded on the voice's model or a kept older one. */
const isCurrent = (story, voice, entry) =>
  !!entry && [VOICES[voice].model, ...VOICES[voice].kept].some((m) => entry.file === fileFor(story, voice, m))

/**
 * Voices the whole story in one request (one take sounds more even than seven, and the TTS models
 * only allow about 100 requests a day), then cuts it at the paragraph breaks and widens those pauses.
 */
async function build(story, voice, cache, force) {
  const file = fileFor(story, voice)
  const cached = cache[story.id]
  if (!force && isCurrent(story, voice, cached) && existsSync(join(AUDIO, cached.file))) return cached

  const { script = String, url, gap: pause = GAP } = VOICES[voice]
  const rate = rateOf(voice)
  let pieces
  if (url) {
    // The home server is free and unlimited but can't hold a whole story in one context (and
    // fetch gives up on a response after 5 minutes), so it reads one paragraph at a time.
    pieces = []
    for (const p of story.paragraphs) pieces.push(trim(await speak(script(p), voice), rate))
  } else {
    const take = trim(await speak(story.paragraphs.map(script).join('\n\n'), voice), rate)
    const cuts = [0, ...(await align(story, take, rate)), take.length]
    pieces = cuts.slice(0, -1).map((at, i) => take.subarray(at, cuts[i + 1]))
  }
  const parts = []
  const starts = []
  let samples = 0
  for (let i = 0; i < pieces.length; i++) {
    const pcm = polish(pieces[i], rate)
    starts.push(+(samples / rate).toFixed(2))
    parts.push(pcm)
    samples += pcm.length
    if (i + 1 < pieces.length) {
      const gap = new Int16Array(Math.round(rate * pause))
      parts.push(gap)
      samples += gap.length
    }
  }
  const all = new Int16Array(samples)
  let o = 0
  for (const p of parts) {
    all.set(p, o)
    o += p.length
  }
  writeFileSync(join(AUDIO, file), toMp3(all, rate, VOICES[voice].kbps))
  const entry = { file, duration: Math.round(samples / rate), starts }
  console.log(`  ${voice} ${story.id}: ${entry.duration}초`)
  return entry
}

function toWav(pcm, rate) {
  const head = Buffer.alloc(44)
  head.write('RIFF', 0, 'ascii')
  head.writeUInt32LE(36 + pcm.length * 2, 4)
  head.write('WAVEfmt ', 8, 'ascii')
  head.writeUInt32LE(16, 16)
  head.writeUInt16LE(1, 20)
  head.writeUInt16LE(1, 22)
  head.writeUInt32LE(rate, 24)
  head.writeUInt32LE(rate * 2, 28)
  head.writeUInt16LE(2, 32)
  head.writeUInt16LE(16, 34)
  head.write('data', 36, 'ascii')
  head.writeUInt32LE(pcm.length * 2, 40)
  return Buffer.concat([head, Buffer.from(pcm.buffer, pcm.byteOffset, pcm.length * 2)])
}

/** Quiet stretches of at least 0.2s, as {start, end} in seconds (20ms windows). */
function pauses(pcm, rate) {
  const w = Math.round(rate / 50)
  const out = []
  let from = -1
  for (let i = 0; i + w <= pcm.length; i += w) {
    let peak = 0
    for (let j = i; j < i + w; j++) peak = Math.max(peak, Math.abs(pcm[j]))
    if (peak < 300) {
      if (from < 0) from = i
    } else if (from >= 0) {
      if (i - from >= rate * 0.2) out.push({ start: from / rate, end: i / rate })
      from = -1
    }
  }
  return out
}

/**
 * Finds where paragraphs 2..n start, as sample offsets. A Gemini model listens to the take and
 * reports approximate start times (falling back to a character-count estimate); each is then
 * snapped to the pause the reader took just before it, so cuts never land mid-word.
 */
async function align(story, pcm, rate) {
  const total = pcm.length / rate
  const n = story.paragraphs.length
  let guess = null
  let why = ''
  const prompt =
    `이 오디오는 아래 원고 ${n}개 문단을 순서대로 읽은 거야. 각 문단의 첫 단어가 들리기 시작하는 시각을 초 단위(소수점 한 자리)로 알려 줘. JSON만: {"starts":[...]}\n\n` +
    story.paragraphs.map((p, i) => `[${i + 1}] ${p}`).join('\n')
  // The listener only needs speech, so high-rate takes go at RATE (which also keeps the request small).
  const wav = toWav(pcm, rate)
  const audio = (rate === RATE ? wav : toWav(decode(resample(wav, RATE)), RATE)).toString('base64')
  for (let attempt = 0; attempt < 4 && !guess; attempt++) {
    if (attempt) await sleep(5000 * attempt)
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${ALIGN_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ inlineData: { mimeType: 'audio/wav', data: audio } }, { text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
      signal: AbortSignal.timeout(180_000),
    }).catch(() => null)
    if (!res?.ok) {
      why = `HTTP ${res?.status ?? '연결 실패'}`
      continue
    }
    try {
      const starts = JSON.parse((await res.json()).candidates[0].content.parts[0].text).starts.map(Number)
      if (starts.length === n && starts.every((t, i) => t >= 0 && t <= total && (i === 0 || t > starts[i - 1]))) guess = starts
      else why = `맞지 않는 답 ${JSON.stringify(starts)}`
    } catch (e) {
      why = `읽을 수 없는 답 (${e.message})`
    }
  }
  if (!guess) {
    console.warn(`  ${story.id}: 문단 위치를 글자 수로 어림했어요 (${why})`)
    const lens = story.paragraphs.map((p) => p.replace(/\s/g, '').length)
    const sum = lens.reduce((a, b) => a + b)
    let acc = 0
    guess = lens.map((l) => (((acc += l) - l) / sum) * total)
  }
  const quiet = pauses(pcm, rate)
  return guess.slice(1).map((t) => {
    let best = null
    let bestScore = Infinity
    for (const p of quiet) {
      const d = Math.abs(p.end - t)
      const score = d - 0.5 * (p.end - p.start)
      if (d < 1.5 && score < bestScore) {
        best = p
        bestScore = score
      }
    }
    // Cut just before the next word, keeping a breath of the pause on the new paragraph.
    const at = best ? Math.max(best.start, best.end - 0.12) : t
    return Math.round(at * rate)
  })
}

// One cache per voice, so several runs (one per voice) can work side by side.
const cachePath = (voice) => join(OUT, voice === 'arin' ? 'cache.json' : `cache-${voice}.json`)
const readCache = (voice) => (existsSync(cachePath(voice)) ? JSON.parse(readFileSync(cachePath(voice), 'utf8')) : {})

/** Writes public/data/stories.json from every voice's cache. A story is listed once any voice has it. */
function writeList(stories) {
  const caches = Object.fromEntries(Object.keys(VOICES).map((v) => [v, readCache(v)]))
  const list = stories
    .filter((s) => Object.keys(VOICES).some((v) => isCurrent(s, v, caches[v][s.id])))
    .map((s) => ({
      ...s,
      voices: Object.fromEntries(
        Object.keys(VOICES)
          .filter((v) => isCurrent(s, v, caches[v][s.id]))
          .map((v) => [v, caches[v][s.id]]),
      ),
    }))
  writeFileSync(join(ROOT, 'public', 'data', 'stories.json'), JSON.stringify({ version: 2, stories: list }, null, 1) + '\n')
  const missing = list.reduce((n, s) => n + Object.keys(VOICES).length - Object.keys(s.voices).length, 0)
  console.log(`✓ 이야기 ${list.length}편${missing ? `, 아직 없는 음성 ${missing}개` : ''}`)
}

mkdirSync(AUDIO, { recursive: true })

const args = process.argv.slice(2)
const flag = (name) => args.find((a) => a.startsWith(`--${name}`))

const voices = flag('voice=')?.split('=')[1].split(',') ?? Object.keys(VOICES)
for (const v of voices) if (!VOICES[v]) throw new Error(`모르는 목소리: ${v}`)

// Settings preview: one short clip per voice, shipped with the app in public/voices.
if (flag('samples')) {
  const text = '안녕하세요, 상식플러스예요. 오늘도 3분 동안 재밌는 이야기 하나 들려드릴게요.'
  mkdirSync(join(ROOT, 'public', 'voices'), { recursive: true })
  await Promise.all(
    voices.map(async (v) => {
      const pcm = polish(trim(await speak((VOICES[v].script ?? String)(text), v), rateOf(v)), rateOf(v))
      writeFileSync(join(ROOT, 'public', 'voices', `${v}.mp3`), toMp3(pcm, rateOf(v), VOICES[v].kbps))
      console.log(`  ${v}: ${(pcm.length / rateOf(v)).toFixed(1)}초`)
    }),
  )
  process.exit(0)
}

const force = !!flag('force')
const ids = args.filter((a) => !a.startsWith('--'))
const stories = await loadStories()
const todo = stories.filter((s) => !ids.length || ids.includes(s.id))

if (flag('dry')) {
  for (const voice of voices) {
    const cache = readCache(voice)
    const missing = todo.filter((s) => force || !isCurrent(s, voice, cache[s.id]) || !existsSync(join(AUDIO, cache[s.id].file)))
    console.log(`${voice}: ${missing.length}편 ${missing.map((s) => s.id).join(' ')}`)
  }
  process.exit(0)
}

let failed = 0
await Promise.all(
  voices.map(async (voice) => {
    const cache = readCache(voice)
    const queue = [...todo]
    const worker = async () => {
      for (let story; (story = queue.shift()); ) {
        try {
          const entry = await build(story, voice, cache, force)
          // Re-read before writing: another run may be filling the same voice for other stories.
          const fresh = { ...readCache(voice), [story.id]: entry }
          writeFileSync(cachePath(voice), JSON.stringify(fresh, null, 2))
        } catch (e) {
          failed++
          console.error(`✗ ${voice} ${story.id}: ${e.message}`)
          if (e.daily) queue.length = 0
        }
      }
    }
    await Promise.all(Array.from({ length: VOICES[voice].parallel ?? PARALLEL }, worker))
  }),
)
writeList(stories)
if (failed) {
  console.error(`✗ ${failed}개 못 만들었어요. 다시 실행하면 빠진 것만 만들어요`)
  process.exit(1)
}
