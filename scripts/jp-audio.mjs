// Records pronunciation for the 일본어 단어 팩 with VOICEVOX (free, runs on this PC): one clip per
// word and one per example sentence, and one per line of a 일본어 듣기 scene, as small MP3s in
// .stories/jp/. Publish them with `node scripts/publish-stories.mjs` (they go to the `stories`
// branch next to the story audio).
//
//   node scripts/jp-audio.mjs              everything not recorded yet (packs/jp-*.json)
//   node scripts/jp-audio.mjs --force      record again
//   node scripts/jp-audio.mjs --force --pack jp-n3     record one pack again
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
import { sayable, sound } from './jp-kana.mjs'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const OUT = join(ROOT, '.stories', 'jp')
const API = 'http://127.0.0.1:50021'
const SPEAKER = 14
// The other person in a 일본어 듣기 scene (점원, 친구 …): VOICEVOX:玄野武宏, as the user picked, so
// the two sides of a conversation sound like two people. "나" keeps 冥鳴ひまり.
const OTHER = 11
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg'
const force = process.argv.includes('--force')
// --pack jp-n3: only that pack (with --force, its clips are recorded again).
const only = process.argv.includes('--pack') ? process.argv[process.argv.indexOf('--pack') + 1] : null

async function query(text, speaker = SPEAKER) {
  const res = await fetch(`${API}/audio_query?speaker=${speaker}&text=${encodeURIComponent(sayable(text))}`, { method: 'POST' })
  if (!res.ok) throw new Error(`audio_query ${res.status}`)
  const q = await res.json()
  q.speedScale = 0.95
  q.intonationScale = 1.15
  return q
}
const spoken = (q) => sound(q.accent_phrases.flatMap((ap) => ap.moras.map((m) => m.text)).join(''))
/** Whether VOICEVOX said `reading` somewhere in `said`; the particles は and へ are said ワ and エ. */
function saidAs(said, reading, whole = false) {
  const want = sound(reading)
  const same = (at) => [...want].every((ch, i) => said[at + i] === ch || (ch === 'ハ' && said[at + i] === 'ワ') || (ch === 'ヘ' && said[at + i] === 'エ'))
  if (whole) return said.length === want.length && same(0)
  for (let at = 0; at + want.length <= said.length; at++) if (same(at)) return true
  return false
}

async function record(q, file, speaker = SPEAKER) {
  const res = await fetch(`${API}/synthesis?speaker=${speaker}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(q) })
  if (!res.ok) throw new Error(`synthesis ${res.status}`)
  const wav = Buffer.from(await res.arrayBuffer())
  const mp3 = spawnSync(FFMPEG, ['-loglevel', 'error', '-i', 'pipe:0', '-ac', '1', '-ar', '24000', '-b:a', '64k', '-f', 'mp3', 'pipe:1'], { input: wav, maxBuffer: 1 << 26 })
  if (mp3.status !== 0) throw new Error(`ffmpeg: ${mp3.error?.message ?? mp3.stderr}`)
  writeFileSync(join(OUT, file), mp3.stdout)
}

mkdirSync(OUT, { recursive: true })
const packs = readdirSync(join(ROOT, 'packs')).filter((f) => /^jp-.*\.json$/.test(f) && (!only || f === `${only}.json`))
let made = 0
const fixed = []
for (const pack of packs) {
  const { cards } = JSON.parse(readFileSync(join(ROOT, 'packs', pack), 'utf8'))
  for (const card of cards) {
    // 일본어 듣기 scenes: each line of the conversation.
    for (const line of card.explanation.listen?.lines ?? []) {
      if (!line.audio || (!force && existsSync(join(OUT, line.audio)))) continue
      const speaker = line.who === '나' ? SPEAKER : OTHER
      await record(await query(line.ja, speaker), line.audio, speaker)
      made++
    }
    const jp = card.explanation.jp
    if (!jp?.audio) continue
    const reading = jp.reading ?? jp.word
    // The word on its own.
    if (force || !existsSync(join(OUT, jp.audio))) {
      let q = await query(jp.word)
      if (!saidAs(spoken(q), reading, true)) {
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
      if (jp.reading && !saidAs(spoken(q), jp.reading)) {
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
