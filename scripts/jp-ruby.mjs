// Furigana for the 일본어 단어 팩 example sentences. VOICEVOX (which also voices them, see
// jp-audio.mjs) says how each sentence reads, and the pack's kanji dictionary (_kanji.mjs) splits
// that over the kanji, so the furigana match the recording and only use readings we've checked.
// The result goes to packs-src/<pack>/_ruby.json, which `npm run packs` reads.
//
//   node scripts/jp-ruby.mjs
//
// Needs the VOICEVOX engine running at 127.0.0.1:50021 (C:\tts\voicevox\windows-cpu\run.exe).
import { readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { compact, isKanji, loadKanji, sayable, sound, splitSpoken, splitWord } from './jp-kana.mjs'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const API = 'http://127.0.0.1:50021'
const SPEAKER = 14

async function spoken(text) {
  const res = await fetch(`${API}/audio_query?speaker=${SPEAKER}&text=${encodeURIComponent(sayable(text))}`, { method: 'POST' })
  if (!res.ok) throw new Error(`audio_query ${res.status}`)
  const q = await res.json()
  return q.accent_phrases.flatMap((ap) => ap.moras.map((m) => m.text)).join('')
}

const failed = []
for (const pack of readdirSync(join(ROOT, 'packs-src')).filter((p) => p.startsWith('jp-'))) {
  const dir = join(ROOT, 'packs-src', pack)
  // A pack without its own kanji dictionary (일본어 듣기) uses the 단어 pack's.
  const dict = (await loadKanji(dir)) ?? (await loadKanji(join(ROOT, 'packs-src', 'jp-n4')))
  const ruby = {}
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.mjs') && !f.startsWith('_')).sort()) {
    for (const c of (await import(pathToFileURL(join(dir, file)).href)).default.cards) {
      // 상황 대답 scenes: what is said (a) and the answer (b), read as they are.
      // The 여행 일본어 pack shows its reply choices in kana, so the wrong ones need readings too.
      const replies = pack === 'jp-travel' && Array.isArray(c.w) ? c.w : []
      for (const text of [c.a, c.b, ...replies].filter(Boolean)) {
        const pieces = splitSpoken([...text], await spoken(text), dict)
        if (pieces) ruby[text] = compact(pieces).map((p) => (p.r ? [p.t, p.r] : p.t))
        else failed.push(`${pack}/${file} ${text}  ←  ${await spoken(text)}`)
      }
      if (!c.ex) continue
      const ja = c.ex.split('=')[0].trim()
      const [before, blank, after] = ja.split(/[{}]/)
      const plain = before + blank + after
      // The card's own word reads as the card says, the same way jp-audio.mjs records it.
      const own = blank === c.w && c.r && [...c.w].some(isKanji)
      let heard = await spoken(plain)
      if (own && !sound(heard).includes(sound(c.r))) heard = await spoken(before + c.r + after)
      const target = own ? { t: blank, r: c.r, pieces: splitWord(c.w, c.r, dict) } : null
      const units = target ? [...before, target, ...after] : [...before, ...[...blank].map((ch) => ch), ...after]
      const pieces = splitSpoken(units, heard, dict)
      if (!pieces) {
        failed.push(`${pack}/${file} ${plain}  ←  ${heard}`)
        continue
      }
      // Without a known reading, still mark where the word is.
      if (!target) {
        let at = 0
        for (const p of pieces) {
          if (at >= before.length && at < before.length + blank.length) p.m = 1
          at += p.t.length
        }
      }
      ruby[plain] = compact(pieces).map((p) => (p.r ? [p.t, p.r, ...(p.m ? [1] : [])] : p.m ? [p.t, '', 1] : p.t))
    }
  }
  writeFileSync(join(dir, '_ruby.json'), JSON.stringify(ruby, null, 0).replace(/\],"/g, '],\n"') + '\n')
  console.log(`${pack}: 예문 ${Object.keys(ruby).length}개`)
}
for (const f of failed) console.log('✗', f)
if (failed.length) {
  console.log(`\n${failed.length}개는 사전(_kanji.mjs)에 없는 읽기예요. VOICEVOX가 잘못 읽었는지 확인하고, 맞으면 읽기를 사전에 더해 주세요.`)
  process.exit(1)
}
