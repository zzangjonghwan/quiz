// Records pronunciation for the 일본어 단어 팩 with VOICEVOX (free, runs on this PC): one clip per
// word and one per example sentence, as small MP3s in .stories/jp/. Publish them with
// `node scripts/publish-stories.mjs` (they go to the `stories` branch next to the story audio).
//
//   node scripts/jp-audio.mjs              everything not recorded yet (packs/jp-*.json)
//   node scripts/jp-audio.mjs --force      record again
//
// Needs the VOICEVOX engine running at 127.0.0.1:50021 (C:\tts\voicevox\windows-cpu\run.exe).
// Voice: VOICEVOX:冥鳴ひまり, a little slower and with a little more pitch movement than default,
// as the user picked. Credit is shown in 설정 > 이미지·소리 출처.
//
// VOICEVOX reads kanji from its own dictionary, so each take is checked against the card's
// reading; when they differ (辛い read つらい instead of からい) the word is voiced from kana.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const OUT = join(ROOT, '.stories', 'jp')
const API = 'http://127.0.0.1:50021'
const SPEAKER = 14
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg'
const force = process.argv.includes('--force')

/** ひらがな → カタカナ */
const kata = (s) => s.replace(/[\u3041-\u3096]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
const VOWEL = {}
for (const [v, row] of Object.entries({
  a: 'アカサタナハマヤラワガザダバパャァ',
  i: 'イキシチニヒミリギジヂビピィ',
  u: 'ウクスツヌフムユルグズヅブプュゥ',
  e: 'エケセテネヘメレゲゼデベペェ',
  o: 'オコソトノホモヨロヲゴゾドボポョォ',
})) for (const ch of row) VOWEL[ch] = v
/**
 * Spelling → sound, so a reading compares with VOICEVOX's moras: long vowels become the vowel
 * itself (キョウ → キョオ, セイ → セエ, ー → the vowel before) and punctuation goes.
 */
function sound(text) {
  // \u30c5/\u30ba, \u30c2/\u30b8 and \u30f2/\u30aa sound the same, and VOICEVOX writes the second of each.
  const chars = [...kata(text).replace(/[^\u30a0-\u30ff]/g, '').replace(/\u30c5/g, '\u30ba').replace(/\u30c2/g, '\u30b8').replace(/\u30f2/g, '\u30aa')]
  let out = ''
  for (const ch of chars) {
    const prev = VOWEL[out.at(-1)]
    if (ch === 'ー' && prev) out += { a: 'ア', i: 'イ', u: 'ウ', e: 'エ', o: 'オ' }[prev]
    else if (ch === 'ウ' && prev === 'o') out += 'オ'
    else if (ch === 'イ' && prev === 'e') out += 'エ'
    else out += ch
  }
  return out
}

async function query(text) {
  const res = await fetch(`${API}/audio_query?speaker=${SPEAKER}&text=${encodeURIComponent(text)}`, { method: 'POST' })
  if (!res.ok) throw new Error(`audio_query ${res.status}`)
  const q = await res.json()
  q.speedScale = 0.95
  q.intonationScale = 1.15
  return q
}
const spoken = (q) => sound(q.accent_phrases.flatMap((ap) => ap.moras.map((m) => m.text)).join(''))

async function record(q, file) {
  const res = await fetch(`${API}/synthesis?speaker=${SPEAKER}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(q) })
  if (!res.ok) throw new Error(`synthesis ${res.status}`)
  const wav = Buffer.from(await res.arrayBuffer())
  const mp3 = spawnSync(FFMPEG, ['-loglevel', 'error', '-i', 'pipe:0', '-ac', '1', '-ar', '24000', '-b:a', '64k', '-f', 'mp3', 'pipe:1'], { input: wav, maxBuffer: 1 << 26 })
  if (mp3.status !== 0) throw new Error(`ffmpeg: ${mp3.error?.message ?? mp3.stderr}`)
  writeFileSync(join(OUT, file), mp3.stdout)
}

mkdirSync(OUT, { recursive: true })
const packs = readdirSync(join(ROOT, 'packs')).filter((f) => /^jp-.*\.json$/.test(f))
let made = 0
const fixed = []
for (const pack of packs) {
  const { cards } = JSON.parse(readFileSync(join(ROOT, 'packs', pack), 'utf8'))
  for (const card of cards) {
    const jp = card.explanation.jp
    if (!jp?.audio) continue
    const reading = jp.reading ?? jp.word
    // The word on its own.
    if (force || !existsSync(join(OUT, jp.audio))) {
      let q = await query(jp.word)
      if (spoken(q) !== sound(reading)) {
        fixed.push(`${jp.word}: ${spoken(q)} → ${sound(reading)}`)
        q = await query(reading)
      }
      await record(q, jp.audio)
      made++
    }
    // The example sentence, with the word itself voiced from kana if VOICEVOX misreads it there.
    const s = jp.sentence
    if (s?.audio && (force || !existsSync(join(OUT, s.audio)))) {
      let q = await query(s.ja)
      if (jp.reading && !spoken(q).includes(sound(jp.reading))) {
        fixed.push(`${s.ja}: ${jp.word} → ${jp.reading}`)
        q = await query(s.ja.replace(jp.word, jp.reading))
      }
      await record(q, s.audio)
      made++
    }
  }
  process.stdout.write(`${pack}: 완료\n`)
}
for (const f of fixed) console.log('  가나로 다시 읽힘:', f)
console.log(`✓ ${made}개 녹음 → ${OUT}`)
