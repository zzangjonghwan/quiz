// Builds the optional 학습 팩 from packs-src/<pack>/*.mjs into packs/<pack>.json and packs/index.json.
// Run with `npm run packs`. The app downloads packs from the web version, which copies packs/ (see
// src/packs.ts), so a pack can be updated by pushing new files; its version goes up whenever its
// content changes.
//
// 일본어 한자 card shapes (short keys keep hundreds of cards readable):
//
//   Kanji: { k: '働', d: 'n', ko: '일할 동', on: 'どう', kun: 'はたら(く)', m: '일하다',
//            p: '亻(사람인변 · 뜻)=사람 / 動(움직일 동 · 소리)=움직이다',
//            l: '사람이 움직인다', t: '기억 팁', x: '덤', ex: '労働(ろうどう)=노동 / 働き者(はたらきもの)=일꾼',
//            w: ['動', '勤', '衝'] (look-alike wrong choices; picked automatically if missing),
//            syn: ['勤'] (never use as a wrong choice, e.g. near-synonyms) }
//     → "이 한자의 뜻으로 알맞은 것은?" (glyph) and "“일하다”라는 뜻의 한자는?"
//
//   Radical (부수): { r: '氵', d: 'e', name: '삼수변', m: '물', from: '水', t: '…', ex: '海·湖·洗·流' }
//     → "이 부수가 나타내는 뜻은?" (glyph) and "‘물’과 관련된 한자에 붙는 부수는?"
//
// 영단어 어원 card shapes:
//
//   Word: { w: 'predict', d: 'e', pos: '동사', m: '예측하다', p: 'pre-=미리 / dict(라틴어 dicere)=말하다',
//           l: '미리 말하다', t: '기억 팁', x: '덤',
//           ex: 'Experts predict a hot summer.=전문가들은 더운 여름을 예측해요.',
//           rel: 'dictionary=사전 / verdict=평결', syn: ['forecast'], wrong: ['protect'] (optional) }
//     → "이 단어의 뜻으로 알맞은 것은?" (glyph) and "“예측하다”라는 뜻의 영단어는?"
//
//   Word part: { r: 'dict', d: 'e', m: '말하다', from: '라틴어 dicere', ex: 'predict · dictionary', t: '…' }
//     'pre-' is a prefix, '-able' a suffix, anything else a root.
//     → "이 어근의 뜻은?" (glyph) and "“말하다”라는 뜻의 어근은?"
//
//   d: e | n | h  →  easy | normal | hard
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadKanji, splitWord } from './jp-kana.mjs'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const SRC = join(ROOT, 'packs-src')
const OUT = join(ROOT, 'packs')
const DIFF = { e: 'easy', n: 'normal', h: 'hard' }

const PACKS = [
  {
    id: 'kanji-n2',
    category: 'kanji',
    kind: 'kanji',
    name: '일본어 한자 (JLPT N2)',
    desc: '모양을 쪼개서 뜻을 익히는 N2 한자와 부수',
  },
  {
    id: 'english-roots',
    category: 'english',
    kind: 'english',
    name: '영단어 어원',
    desc: '접두사·어근·접미사로 쪼개서 처음 보는 단어도 짐작하는 영단어',
    // Apps up to v0.10 don't know this category, so it is listed only in catalog.json.
    newApps: true,
  },
  {
    id: 'jp-n4',
    category: 'japanese',
    kind: 'japanese',
    name: '일본어 단어 (JLPT N4)',
    desc: '한자 쪼개기, 한국어 한자음 다리, 헷갈리는 짝, 발음 듣기로 익히는 N4 단어',
    minVersion: '0.14.0',
    newApps: true,
  },
]

const errors = []
const isHan = (s) => /^[\p{Script=Han}⺀-⿕]$/u.test(s)

/** Stable pseudo-random order so rebuilding doesn't reshuffle every wrong choice. */
function seededShuffle(items, seed) {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** "亻(사람인변 · 뜻)=사람 / 動(움직일 동)=움직이다" → breakdown parts. */
function parseParts(where, p) {
  if (!p) return undefined
  return p.split(' / ').map((entry) => {
    const eq = entry.indexOf('=')
    if (eq < 0) errors.push(`${where}: p 항목은 'part(이름)=뜻' 형식이어야 함 (${entry})`)
    const left = entry.slice(0, eq).trim()
    const meaning = entry.slice(eq + 1).trim()
    const m = left.match(/^(.*?)\((.*)\)$/)
    return m ? { part: m[1].trim(), origin: m[2].trim(), meaning } : { part: left, meaning }
  })
}

/** "労働(ろうどう)=노동 / …" → example words. */
function parseWords(where, ex) {
  if (!ex) return undefined
  return ex.split(' / ').map((entry) => {
    const m = entry.trim().match(/^(.+?)\((.+?)\)=(.+)$/)
    if (!m) errors.push(`${where}: ex 항목은 '단어(읽기)=뜻' 형식이어야 함 (${entry})`)
    return m ? { word: m[1], reading: m[2], meaning: m[3].trim() } : { word: entry, reading: '', meaning: '' }
  })
}

/** "dictionary=사전 / verdict=평결" → related words. */
function parseRelated(where, rel) {
  if (!rel) return undefined
  return rel.split(' / ').map((entry) => {
    const [word, meaning] = entry.split('=').map((s) => s?.trim())
    if (!word || !meaning) errors.push(`${where}: rel 항목은 '단어=뜻' 형식이어야 함 (${entry})`)
    return { word, meaning }
  })
}

/** Whether the last Hangul syllable has a final consonant (받침). */
function hasFinal(word) {
  const last = [...word.replace(/[^가-힣]/g, '')].pop() ?? ''
  const code = last.charCodeAt(0) - 0xac00
  return !(code >= 0 && code <= 11171 && code % 28 === 0)
}
/** 과/와 by whether the last syllable has a final consonant. */
const gwa = (word) => (hasFinal(word) ? '과' : '와')
/** “사전”이라는 / “말하다”라는 */
const quoted = (m) => `“${m}”${hasFinal(m) ? '이라는' : '라는'}`

const tokens = (m) => m.split(/[,·/]/).map((t) => t.trim()).filter(Boolean)
/** Meaning words too close to tell apart as choices: 앞 / 앞으로, 넘어서 / 넘어선, 예측 / 예측하다. */
const similar = (a, b) => a === b || a.startsWith(b) || b.startsWith(a) || (a.length >= 2 && b.length >= 2 && a.slice(0, 2) === b.slice(0, 2))
const overlaps = (a, b) => tokens(a).some((t) => tokens(b).some((u) => similar(t, u)))

/** 3 wrong meanings: same kind of card, no shared meaning word, similar length first. */
function wrongMeanings(card, pool, seed) {
  const avoid = new Set([card.char, ...(card.syn ?? [])])
  const candidates = seededShuffle(
    pool.filter((c) => c !== card && !avoid.has(c.char) && !(c.syn ?? []).includes(card.char) && !overlaps(c.m, card.m)),
    seed,
  )
  const target = card.m.length
  candidates.sort((a, b) => Math.abs(a.m.length - target) - Math.abs(b.m.length - target))
  const picked = []
  for (const c of candidates) {
    if (picked.some((m) => overlaps(m, c.m))) continue
    picked.push(c.m)
    if (picked.length === 3) break
  }
  return picked
}

/** 3 wrong characters/words: given look-alikes, then cards sharing a part, then others of the same kind. */
function wrongChars(card, pool, seed) {
  const avoid = new Set([card.char, ...(card.syn ?? [])])
  const ok = (c) => !avoid.has(c.char) && !(c.syn ?? []).includes(card.char) && !overlaps(c.m, card.m)
  const picked = [...(card.w ?? [])]
  const parts = new Set((card.breakdown ?? []).map((b) => b.part))
  const sharing = seededShuffle(pool.filter((c) => c !== card && ok(c) && (c.breakdown ?? []).some((b) => parts.has(b.part))), seed)
  const rest = seededShuffle(pool.filter((c) => c !== card && ok(c)), seed + 'r')
  for (const c of [...sharing, ...rest]) {
    if (picked.length >= 3) break
    if (!picked.includes(c.char)) picked.push(c.char)
  }
  return picked.slice(0, 3)
}

async function readCards(pack) {
  const dir = join(SRC, pack.id)
  const cards = []
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.mjs') && !f.startsWith('_')).sort()) {
    const mod = (await import(pathToFileURL(join(dir, file)).href)).default
    for (const c of mod.cards) cards.push({ c, file })
  }
  return cards
}

function checkDuplicates(entries) {
  const seen = new Set()
  for (const e of entries) {
    const key = (e.radical ? 'r' : 'k') + e.char
    if (seen.has(key)) errors.push(`${e.where}: 같은 항목이 두 번 나옴`)
    seen.add(key)
  }
}

async function buildKanji(pack) {
  const entries = []
  for (const { c, file } of await readCards(pack)) {
    const char = c.k ?? c.r
    const where = `${pack.id}/${file} ${char}`
    if (!char || !isHan(char)) errors.push(`${where}: k/r은 한자 한 글자`)
    if (!DIFF[c.d]) errors.push(`${where}: d는 e/n/h`)
    if (!c.m) errors.push(`${where}: m(뜻)은 필수`)
    if (c.k && !c.on && !c.kun) errors.push(`${where}: 음독(on)이나 훈독(kun)이 필요함`)
    entries.push({ ...c, char, radical: !!c.r, where, breakdown: parseParts(where, c.p), words: c.k ? parseWords(where, c.ex) : undefined })
  }
  checkDuplicates(entries)

  const radicals = entries.filter((e) => e.radical)
  const kanji = entries.filter((e) => !e.radical)
  return entries.map((e) => {
    const pool = e.radical ? radicals : kanji
    const id = `kanji-${e.radical ? 'r' : ''}${e.char.codePointAt(0).toString(16)}`
    const meanings = wrongMeanings(e, pool, id + 'm')
    const chars = wrongChars(e, pool, id + 'c')
    if (meanings.length < 3 || chars.length < 3) errors.push(`${e.where}: 오답 후보 부족`)
    for (const w of chars) if (!isHan(w)) errors.push(`${e.where}: 오답 글자 이상 (${w})`)
    const questions = e.radical
      ? [
          { mode: 'mcq', prompt: '이 부수가 나타내는 뜻은?', glyph: e.char, choices: [e.m, ...meanings] },
          { mode: 'mcq', prompt: `‘${e.m}’${gwa(e.m)} 관련된 한자에 붙는 부수는?`, choices: [e.char, ...chars] },
        ]
      : [
          { mode: 'mcq', prompt: '이 한자의 뜻으로 알맞은 것은?', glyph: e.char, choices: [e.m, ...meanings] },
          { mode: 'mcq', prompt: `${quoted(e.m)} 뜻의 한자는?`, choices: [e.char, ...chars] },
        ]
    const kanjiInfo = e.radical
      ? { char: e.char, ko: e.name }
      : {
          char: e.char,
          ...(e.ko && { ko: e.ko }),
          ...(e.on && { on: e.on }),
          ...(e.kun && { kun: e.kun }),
          ...(e.words && { words: e.words }),
        }
    const meaning = e.radical
      ? `${e.from ? `${e.from}에서 온 부수로, ` : ''}‘${e.m}’${gwa(e.m)} 관련된 한자에 붙어요.${e.ex ? ` 예: ${e.ex}` : ''}`
      : e.m
    return {
      id,
      difficulty: DIFF[e.d],
      answer: e.char,
      questions,
      explanation: {
        kanji: JSON.parse(JSON.stringify(kanjiInfo)),
        ...(e.breakdown && { breakdown: e.breakdown }),
        ...(e.l && { literal: e.l }),
        meaning,
        ...(e.o && { origin: e.o }),
        ...(e.t && { tip: e.t }),
        ...(e.x && { bonus: e.x }),
      },
    }
  })
}

const POS = ['명사', '동사', '형용사', '부사']
/** 'pre-' → 접두사, '-able' → 접미사, otherwise 어근. */
const partKind = (r) => (r.endsWith('-') ? '접두사' : r.startsWith('-') ? '접미사' : '어근')

async function buildEnglish(pack) {
  const entries = []
  for (const { c, file } of await readCards(pack)) {
    const char = c.w ?? c.r
    const where = `${pack.id}/${file} ${char}`
    if (c.w && !/^[a-z]+(-[a-z]+)*$/.test(c.w)) errors.push(`${where}: w는 소문자 영단어`)
    if (c.r && !/^-?[a-z]+-?$/.test(c.r)) errors.push(`${where}: r은 'pre-', 'dict', '-able' 꼴`)
    if (!DIFF[c.d]) errors.push(`${where}: d는 e/n/h`)
    if (!c.m) errors.push(`${where}: m(뜻)은 필수`)
    if (c.w && !POS.includes(c.pos)) errors.push(`${where}: pos는 ${POS.join('/')}`)
    if (c.w && !c.p) errors.push(`${where}: p(어원 쪼개기)는 필수`)
    let sentence
    if (c.w && c.ex) {
      const [en, ko] = c.ex.split('=').map((s) => s?.trim())
      if (!en || !ko) errors.push(`${where}: ex는 '영어 예문=번역' 형식`)
      // The word (or an inflected form of it) should appear in its own example.
      else if (!en.toLowerCase().includes(c.w.slice(0, Math.max(3, c.w.length - 3)))) errors.push(`${where}: 예문에 단어가 없음`)
      sentence = { en, ko }
    }
    entries.push({
      ...c,
      // wrongChars() reads hand-picked wrong choices from `w`, which here is the word itself.
      w: c.wrong,
      char,
      radical: !!c.r,
      kind: c.r ? partKind(c.r) : c.pos,
      where,
      breakdown: parseParts(where, c.p),
      sentence,
      related: parseRelated(where, c.rel),
    })
  }
  checkDuplicates(entries)

  const words = entries.filter((e) => !e.radical)
  return entries.map((e) => {
    // Wrong meanings come from the same part of speech (or the same kind of word part), so the
    // choices read alike; wrong words prefer ones built on the same parts.
    const sameKind = entries.filter((x) => x.radical === e.radical && x.kind === e.kind)
    const id = e.radical
      ? `english-${{ 접두사: 'pfx', 접미사: 'sfx', 어근: 'root' }[e.kind]}-${e.char.replace(/-/g, '')}`
      : `english-${e.char}`
    const meanings = wrongMeanings(e, sameKind.length >= 8 ? sameKind : e.radical ? entries.filter((x) => x.radical) : words, id + 'm')
    const chars = wrongChars(e, e.radical ? sameKind : words, id + 'c')
    if (meanings.length < 3 || chars.length < 3) errors.push(`${e.where}: 오답 후보 부족`)
    const questions = e.radical
      ? [
          { mode: 'mcq', prompt: `이 ${e.kind}의 뜻은?`, glyph: e.char, choices: [e.m, ...meanings] },
          { mode: 'mcq', prompt: `${quoted(e.m)} 뜻의 ${e.kind}${e.kind === '어근' ? '은' : '는'}?`, choices: [e.char, ...chars] },
        ]
      : [
          { mode: 'mcq', prompt: '이 단어의 뜻으로 알맞은 것은?', glyph: e.char, choices: [e.m, ...meanings] },
          { mode: 'mcq', prompt: `${quoted(e.m)} 뜻의 영단어는?`, choices: [e.char, ...chars] },
        ]
    const word = e.radical
      ? { text: e.char, pos: e.kind }
      : { text: e.char, pos: e.pos, ...(e.sentence && { sentence: e.sentence }), ...(e.related && { related: e.related }) }
    const meaning = e.radical
      ? `${e.from ? `${e.from}에서 온 ${e.kind}로, ` : ''}‘${e.m}’의 뜻을 더해요.${e.ex ? ` 예: ${e.ex}` : ''}`
      : e.m
    return {
      id,
      difficulty: DIFF[e.d],
      answer: e.char,
      questions,
      explanation: {
        word,
        ...(e.breakdown && { breakdown: e.breakdown }),
        ...(e.l && { literal: e.l }),
        meaning,
        ...(e.o && { origin: e.o }),
        ...(e.t && { tip: e.t }),
        ...(e.x && { bonus: e.x }),
      },
    }
  })
}

// 일본어 단어 card shape:
//
//   { w: '電車', r: 'でんしゃ', d: 'e', pos: '명사', m: '전철, 전차',
//     kr: '전차' (the same hanja word in Korean, for the 소리 다리),
//     ex: '{電車}で会社に行きます。=[전철]로 회사에 가요.' (the word in {…}, its Korean in […]),
//     l: '…' (합치면, when joining the kanji's meanings doesn't read well), t: '기억 팁', x: '덤',
//     vs: '…' (a word in the pack that's easy to mix up), vn: '…' (how to tell them apart),
//     syn: [...] (never a wrong choice) }
//
// The kanji in it are explained from packs-src/<pack>/_kanji.mjs, and the furigana over the example
// come from _ruby.json (made by scripts/jp-ruby.mjs, which checks them against the recording).
const JP_POS = ['명사', '동사', 'い형용사', 'な형용사', '부사', '표현']
const hasKanji = (s) => /\p{Script=Han}/u.test(s)
const isJapanese = (s) => /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー〜・]+$/u.test(s)
/** Stable id from the word and its reading, so cards keep their progress when files are reordered. */
const jpId = (w, r) => createHash('sha1').update(`${w}|${r ?? ''}`).digest('hex').slice(0, 10)

async function buildJapanese(pack) {
  const dir = join(SRC, pack.id)
  const dict = await loadKanji(dir)
  const rubyFile = join(dir, '_ruby.json')
  const ruby = existsSync(rubyFile) ? JSON.parse(readFileSync(rubyFile, 'utf8')) : {}
  if (!dict) errors.push(`${pack.id}: 한자 사전 _kanji.mjs가 없음`)
  const entries = []
  for (const { c, file } of await readCards(pack)) {
    const where = `${pack.id}/${file} ${c.w}`
    if (!c.w || !isJapanese(c.w)) errors.push(`${where}: w는 일본어 단어`)
    if (hasKanji(c.w) && !c.r) errors.push(`${where}: 한자가 있으면 r(읽기)이 필요함`)
    if (c.r && !/^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u.test(c.r)) errors.push(`${where}: r은 가나로만`)
    if (!DIFF[c.d]) errors.push(`${where}: d는 e/n/h`)
    if (!c.m) errors.push(`${where}: m(뜻)은 필수`)
    if (!JP_POS.includes(c.pos)) errors.push(`${where}: pos는 ${JP_POS.join('/')}`)
    // The word kanji by kanji: 電車 → 電(でん) + 車(しゃ).
    let pieces
    if (dict && hasKanji(c.w) && c.r) {
      pieces = splitWord(c.w, c.r, dict)
      if (!pieces) errors.push(`${where}: _kanji.mjs의 읽기로 ${c.r}를 한자마다 나눌 수 없음 (읽기를 더하거나 whole에 넣기)`)
      for (const ch of [...c.w].filter(hasKanji)) if (!dict.kanji.has(ch)) errors.push(`${where}: _kanji.mjs에 ${ch}가 없음`)
    }
    let sentence
    if (c.ex) {
      const [ja, ko] = c.ex.split('=').map((s) => s?.trim())
      if (!ja || !ko) errors.push(`${where}: ex는 '일본어 예문=번역' 형식`)
      else {
        const blank = ja.match(/\{(.+?)\}/)?.[1]
        if (!blank) errors.push(`${where}: 예문에서 이 단어를 {…}로 표시해야 함`)
        if ((ko.match(/\[[^\]]+\]/g) ?? []).length !== 1) errors.push(`${where}: 번역에서 이 단어에 해당하는 말을 […]로 한 번 표시해야 함`)
        const plain = ja.replace(/[{}]/g, '')
        if (!ruby[plain]) errors.push(`${where}: 예문 후리가나가 없음 — VOICEVOX를 켜고 node scripts/jp-ruby.mjs`)
        sentence = { ja: plain, ko, blank, gap: ja.replace(/\{.+?\}/, '＿＿'), ruby: ruby[plain] }
      }
    }
    const id = `japanese-${jpId(c.w, c.r)}`
    entries.push({
      ...c,
      // wrongChars() reads hand-picked wrong choices from `w`, which here is the word itself.
      w: undefined,
      word: c.w,
      char: c.w,
      id,
      where,
      pieces,
      sentence,
      label: c.r && hasKanji(c.w) ? `${c.w}（${c.r}）` : c.w,
    })
  }
  checkDuplicates(entries)
  const byWord = new Map(entries.map((e) => [e.word, e]))
  for (const e of entries) if (e.vs && !byWord.has(e.vs)) errors.push(`${e.where}: vs(헷갈리는 짝) '${e.vs}'가 팩에 없음`)

  return entries.map((e) => {
    const samePos = entries.filter((x) => x.pos === e.pos)
    const pool = samePos.length >= 8 ? samePos : entries
    const pair = e.vs ? byWord.get(e.vs) : undefined
    const audio = `${e.id.replace('japanese-', '')}.mp3`
    const others = (pick, seed, filter = () => true) => {
      const out = []
      for (const x of seededShuffle(pool.filter((x) => x !== e && filter(x) && !overlaps(x.m, e.m) && !(e.syn ?? []).includes(x.word)), e.id + seed)) {
        const v = pick(x)
        if (v && !out.includes(v) && v !== pick(e)) out.push(v)
        if (out.length === 3) break
      }
      return out
    }
    const meanings = wrongMeanings({ ...e, char: e.word }, pool.map((x) => ({ ...x, char: x.word })), e.id + 'm')
    // The look-alike goes first among the wrong words, so the pair meets head-on, unless the two
    // mean nearly the same (思う/考える), where it would make two right answers.
    const contrast = pair && !overlaps(pair.m, e.m) ? [pair.label] : []
    const wrongWords = [...contrast, ...others((x) => x.label, 'w')].filter((v, i, a) => a.indexOf(v) === i).slice(0, 3)
    // A kanji word's reading and sound stay hidden until the question is answered (reveal), so it
    // is recalled from the kanji first and then heard. A kana word (ワクワク) can be heard right away.
    // `skill` is the 문제 형식 players can leave out before starting (src/formats.ts).
    const questions = [
      { mode: 'mcq', skill: 'meaning', prompt: '이 단어의 뜻으로 알맞은 것은?', glyph: e.word, ...(e.label !== e.word && { glyphSub: e.r }), audio, ...(hasKanji(e.word) && { reveal: true }), choices: [e.m, ...meanings] },
      { mode: 'mcq', skill: 'word', prompt: `${quoted(e.m)} 뜻의 일본어는?`, choices: [e.label, ...wrongWords] },
    ]
    if (e.kr) {
      // Here the reading is the clue: でんしゃ sounds like 전차.
      const kos = others((x) => x.kr, 'k')
      if (kos.length === 3)
        questions.push({ mode: 'mcq', skill: 'bridge', prompt: '같은 한자를 쓰는 한국어 단어는?', glyph: e.word, glyphSub: e.r, audio, choices: [e.kr, ...kos] })
    }
    if (e.sentence?.blank === e.word) {
      questions.push({ mode: 'mcq', skill: 'blank', prompt: '빈칸에 알맞은 말은?', glyph: e.sentence.gap, glyphSub: e.sentence.ko, choices: [e.label, ...wrongWords] })
    }
    // 한자 쪼개기: each kanji with its reading here and its Korean hanja name.
    const kanjiPieces = (e.pieces ?? []).flatMap((p) =>
      p.whole ? [...p.t].map((ch) => ({ ch, whole: true })) : p.r ? [{ ch: p.t, r: p.r }] : [],
    )
    const breakdown = kanjiPieces.map(({ ch, r }) => {
      const k = dict.kanji.get(ch)
      return { part: ch, ...(r && { origin: r }), meaning: k.old ? `${k.ko} · 한국 한자 ${k.old}` : k.ko }
    })
    const literal =
      e.l ?? (kanjiPieces.length >= 2 ? `${kanjiPieces.map(({ ch }) => dict.kanji.get(ch).kw).join(' + ')} → ${e.m.split(',')[0].replace(/\(.*?\)/g, '').trim()}` : undefined)
    const whole = (e.pieces ?? []).find((p) => p.whole)
    const jp = {
      word: e.word,
      ...(e.label !== e.word && { reading: e.r }),
      pos: e.pos,
      audio,
      ...(whole && { whole: { word: whole.t, reading: whole.r } }),
      ...(e.kr && { bridge: { ko: e.kr } }),
      ...(e.sentence && { sentence: { ja: e.sentence.ja, ko: e.sentence.ko, ruby: e.sentence.ruby, audio: audio.replace('.mp3', '-ex.mp3') } }),
      ...(pair && { pair: { word: pair.word, ...(pair.label !== pair.word && { reading: pair.r }), meaning: pair.m, note: e.vn ?? '' } }),
    }
    return {
      id: e.id,
      difficulty: DIFF[e.d],
      answer: e.word,
      questions,
      explanation: {
        jp,
        ...(breakdown.length > 0 && { breakdown }),
        ...(literal && { literal }),
        meaning: e.m,
        ...(e.t && { tip: e.t }),
        ...(e.x && { bonus: e.x }),
      },
    }
  })
}

const BUILDERS = { kanji: buildKanji, english: buildEnglish, japanese: buildJapanese }

mkdirSync(OUT, { recursive: true })
// Pack lists, newest first. The app reads catalog-v2.json (src/packs.ts) and hides packs whose
// minVersion is newer than itself. Older apps read older lists, which only name packs they can show:
// catalog.json (v0.11–v0.13, no packs with a minVersion) and index.json (up to v0.10).
const catalog2Path = join(OUT, 'catalog-v2.json')
const catalogPath = join(OUT, 'catalog.json')
const indexPath = join(OUT, 'index.json')
const previous = [catalog2Path, catalogPath, indexPath].filter(existsSync).flatMap((f) => JSON.parse(readFileSync(f, 'utf8')).packs)
const index = []
for (const { kind, newApps, ...pack } of PACKS) {
  const cards = await BUILDERS[kind](pack)
  for (const card of cards) {
    for (const q of card.questions) {
      if (new Set(q.choices).size !== 4) errors.push(`${card.id}: 보기 중복 ${q.choices.join(' / ')}`)
    }
  }
  if (new Set(cards.map((c) => c.id)).size !== cards.length) errors.push(`${pack.id}: id 중복`)
  if (errors.length) break
  const body = JSON.stringify({ category: pack.category, version: 1, cards })
  const hash = createHash('sha1').update(body).digest('hex').slice(0, 12)
  const old = previous.find((p) => p.id === pack.id)
  const version = old ? (old.hash === hash ? old.version : old.version + 1) : 1
  const json = JSON.stringify({ category: pack.category, version, cards }) + '\n'
  writeFileSync(join(OUT, `${pack.id}.json`), json)
  index.push({ ...pack, version, hash, cards: cards.length, bytes: Buffer.byteLength(json), newApps })
  const counts = Object.fromEntries(Object.values(DIFF).map((d) => [d, cards.filter((c) => c.difficulty === d).length]))
  console.log(`${pack.id}: ${cards.length}장 (쉬움 ${counts.easy} / 보통 ${counts.normal} / 어려움 ${counts.hard}) v${version}`)
}

if (errors.length) {
  for (const e of errors) console.error('✗', e)
  process.exit(1)
}
const listed = (packs) => JSON.stringify({ packs: packs.map(({ newApps, ...p }) => p) }, null, 2) + '\n'
writeFileSync(catalog2Path, listed(index))
writeFileSync(catalogPath, listed(index.filter((p) => !p.minVersion)))
writeFileSync(indexPath, listed(index.filter((p) => !p.newApps && !p.minVersion)))
