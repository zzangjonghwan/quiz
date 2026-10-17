// Kana helpers for the 일본어 단어 팩, shared by build-packs.mjs, jp-audio.mjs and jp-ruby.mjs:
// spelling ↔ sound, splitting a word's reading over its kanji, and look-alike wrong readings.
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

/** ひらがな → カタカナ */
export const kata = (s) => s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
/** カタカナ → ひらがな */
export const hira = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
export const isKanji = (ch) => /\p{Script=Han}|々/u.test(ch)
const isKana = (ch) => /[ぁ-ゖァ-ヺー]/.test(ch)

const VOWEL = {}
for (const [v, row] of Object.entries({
  a: 'アカサタナハマヤラワガザダバパャァ',
  i: 'イキシチニヒミリギジヂビピィ',
  u: 'ウクスツヌフムユルグズヅブプュゥ',
  e: 'エケセテネヘメレゲゼデベペェ',
  o: 'オコソトノホモヨロヲゴゾドボポョォ',
})) for (const ch of row) VOWEL[ch] = v
const VOWEL_KANA = { a: 'ア', i: 'イ', u: 'ウ', e: 'エ', o: 'オ' }

/**
 * Spelling → sound, so a reading compares with VOICEVOX's moras: long vowels become the vowel
 * itself (キョウ → キョオ, セイ → セエ, ー → the vowel before) and punctuation goes.
 */
export function sound(text) {
  // ヅ/ズ, ヂ/ジ and ヲ/オ sound the same, and VOICEVOX writes the second of each.
  const chars = [...kata(text).replace(/[^゠-ヿ]/g, '').replace(/ヅ/g, 'ズ').replace(/ヂ/g, 'ジ').replace(/ヲ/g, 'オ')]
  let out = ''
  for (const ch of chars) {
    const prev = VOWEL[out.at(-1)]
    if (ch === 'ー' && prev) out += VOWEL_KANA[prev]
    else if (ch === 'ウ' && prev === 'o') out += 'オ'
    else if (ch === 'イ' && prev === 'e') out += 'エ'
    else out += ch
  }
  return out
}

/** The pack's kanji dictionary (packs-src/<pack>/_kanji.mjs), or null if it has none. */
export async function loadKanji(dir) {
  const file = join(dir, '_kanji.mjs')
  if (!existsSync(file)) return null
  const mod = await import(pathToFileURL(file).href)
  const kanji = new Map()
  for (const [ch, line] of Object.entries(mod.kanji)) {
    const [ko, kw, readings, old] = line.split('|')
    kanji.set(ch, { ko, kw: kw || ko.split(' ')[0], readings: readings.split(','), ...(old && { old }) })
  }
  return { kanji, whole: new Map(Object.entries(mod.whole ?? {})) }
}

const VOICED = { か: 'が', き: 'ぎ', く: 'ぐ', け: 'げ', こ: 'ご', さ: 'ざ', し: 'じ', す: 'ず', せ: 'ぜ', そ: 'ぞ', た: 'だ', ち: 'ぢ', つ: 'づ', て: 'で', と: 'ど', は: 'ば', ひ: 'び', ふ: 'ぶ', へ: 'べ', ほ: 'ぼ' }
const SEMI = { は: 'ぱ', ひ: 'ぴ', ふ: 'ぷ', へ: 'ぺ', ほ: 'ぽ' }

/**
 * The ways a kanji's reading can sound inside a word: as is, voiced when it isn't first
 * (ほん+たな → ほんだな), ぱ-row after ん/っ (さん+ほ → さんぽ), and cut short with っ before
 * another sound (がく+こう → がっこう).
 */
function variants(reading, first, last) {
  const heads = [reading]
  if (!first) {
    const h = reading[0]
    if (VOICED[h]) heads.push(VOICED[h] + reading.slice(1))
    if (SEMI[h]) heads.push(SEMI[h] + reading.slice(1))
  }
  const out = [...heads]
  if (!last) for (const r of heads) if (/[くつちき]$/.test(r) && r.length > 1) out.push(r.slice(0, -1) + 'っ')
  return out
}

/**
 * Splits `text` (kanji and kana) over its reading, kanji by kanji: 食べ物/たべもの →
 * [食:た][べ][物:もの]. `same(a, b)` compares kana with kana. Returns null if the dictionary has
 * no reading that fits.
 */
function split(text, reading, dict, same) {
  const units = Array.isArray(text) ? text : [...text]
  const kanjiAt = (i) => i < units.length && typeof units[i] === 'string' && isKanji(units[i])
  const go = (i, j) => {
    if (i === units.length) return j === reading.length ? [] : null
    const ch = units[i]
    // A piece whose reading is already known (the card's own word in its example sentence).
    if (typeof ch !== 'string') {
      const used = same(reading, j, ch.r)
      const rest = used && go(i + 1, j + used)
      return rest ? [...ch.pieces.map((p) => ({ ...p, m: 1 })), ...rest] : null
    }
    if (isKanji(ch)) {
      const first = !kanjiAt(i - 1)
      // A word read as a whole (今日 → きょう), longest first.
      for (let n = Math.min(4, units.length - i); n >= 2; n--) {
        const w = units.slice(i, i + n).join('')
        const r = dict.whole.get(w)
        if (r && same(reading, j, r)) {
          const rest = go(i + n, j + same(reading, j, r))
          if (rest) return [{ t: w, r, whole: true }, ...rest]
        }
      }
      const entry = dict.kanji.get(ch)
      if (!entry) return null
      // Every reading as is before any changed form, so 中 in 一日中 is じゅう, not ちゅう voiced
      // to ぢゅう (which sounds the same).
      const forms = entry.readings.map((base) => variants(base, first, !kanjiAt(i + 1)))
      for (let n = 0; n < Math.max(...forms.map((f) => f.length)); n++) {
        for (const v of forms.map((f) => f[n]).filter(Boolean)) {
          const used = same(reading, j, v)
          if (!used) continue
          const rest = go(i + 1, j + used)
          if (rest) return [{ t: ch, r: v }, ...rest]
        }
      }
      return null
    }
    if (isKana(ch)) {
      const used = same(reading, j, ch)
      if (!used) return null
      const rest = go(i + 1, j + used)
      return rest && [{ t: ch }, ...rest]
    }
    // Anything else in a sentence: punctuation reads as nothing, Latin letters (LINE) as some kana.
    if (/[A-Za-z0-9]/.test(ch)) {
      for (let n = 0; j + n <= reading.length; n++) {
        const rest = go(i + 1, j + n)
        if (rest) return [{ t: ch }, ...rest]
      }
      return null
    }
    const rest = go(i + 1, j)
    return rest && [{ t: ch }, ...rest]
  }
  return go(0, 0)
}

/** A word against its own reading, kana for kana. */
export function splitWord(word, reading, dict) {
  return split(word, reading, dict, (s, j, part) => (s.startsWith(part, j) ? part.length : 0))
}

/**
 * A sentence against what VOICEVOX said (its moras, as katakana): particles sound different
 * from their spelling (は → ワ) and long vowels are just vowels, so kana match by sound.
 */
export function splitSpoken(sentence, spoken, dict) {
  const heard = sound(spoken)
  const same = (s, j, part) => {
    // Sound the part with the sound just before it, so a long vowel (こう → コオ) comes out the same.
    const prev = j > 0 ? s[j - 1] : ''
    const want = sound(prev + part).slice(prev ? 1 : 0)
    if (s.startsWith(want, j)) return want.length
    // は, へ and を as particles.
    // いう is said ユウ.
    if (part === 'い' && s[j] === 'ユ' && s[j + 1] === 'ウ') return 1
    const particle = { は: 'ワ', へ: 'エ', を: 'オ' }[part]
    return particle && s[j] === particle ? 1 : 0
  }
  return split(sentence, heard, dict, same)
}

/** Joins neighbouring plain pieces: [{t, r?}] with kana runs merged. */
export function compact(pieces) {
  const out = []
  for (const p of pieces) {
    const last = out.at(-1)
    if (!p.r && last && !last.r && !p.m === !last.m) last.t += p.t
    else out.push({ t: p.t, ...(p.r && { r: p.r }), ...(p.m && { m: 1 }) })
  }
  return out
}

/**
 * Where VOICEVOX's own reading is wrong or less usual, it's given kana instead: 日本 is にっぽん to
 * it, but everyday Japanese (and what learners hear) is にほん; 雨が降りそう is ふりそう, not おりそう;
 * 角 (corner) is かど, not かく; 〜は何ですか is なんですか; 辛いもの is からいもの.
 */
const SAY = [
  ['日本', 'にほん'],
  ['雨が降りそう', '雨がふりそう'],
  ['あの角を', 'あのかどを'],
  ['は何ですか', 'はなんですか'],
  ['辛いもの', 'からいもの'],
]
export const sayable = (text) => SAY.reduce((t, [from, to]) => t.replaceAll(from, to), text)
