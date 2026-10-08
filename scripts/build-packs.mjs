// Builds the optional 학습 팩 from packs-src/<pack>/*.mjs into packs/<pack>.json and packs/index.json.
// Run with `npm run packs`. The app downloads packs from packs/ on main (see src/packs.ts), so a
// pack can be updated by pushing new files; its version goes up whenever its content changes.
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
//   d: e | n | h  →  easy | normal | hard
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const SRC = join(ROOT, 'packs-src')
const OUT = join(ROOT, 'packs')
const DIFF = { e: 'easy', n: 'normal', h: 'hard' }

const PACKS = [
  {
    id: 'kanji-n2',
    category: 'kanji',
    name: '일본어 한자 (JLPT N2)',
    desc: '모양을 쪼개서 뜻을 익히는 N2 한자와 부수',
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

/** 과/와 by whether the last syllable has a final consonant. */
function gwa(word) {
  const code = word.trim().slice(-1).charCodeAt(0) - 0xac00
  return code >= 0 && code <= 11171 && code % 28 === 0 ? '와' : '과'
}

const tokens = (m) => m.split(/[,·/]/).map((t) => t.trim()).filter(Boolean)
const overlaps = (a, b) => tokens(a).some((t) => tokens(b).includes(t))

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

/** 3 wrong characters: given look-alikes, then cards sharing a component, then others of the same kind. */
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

function cardId(prefix, char) {
  return `kanji-${prefix}${char.codePointAt(0).toString(16)}`
}

async function buildPack(pack) {
  const dir = join(SRC, pack.id)
  const entries = []
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort()) {
    const mod = (await import(pathToFileURL(join(dir, file)).href)).default
    for (const c of mod.cards) {
      const char = c.k ?? c.r
      const where = `${pack.id}/${file} ${char}`
      if (!char || !isHan(char)) errors.push(`${where}: k/r은 한자 한 글자`)
      if (!DIFF[c.d]) errors.push(`${where}: d는 e/n/h`)
      if (!c.m) errors.push(`${where}: m(뜻)은 필수`)
      if (c.k && (!c.on && !c.kun)) errors.push(`${where}: 음독(on)이나 훈독(kun)이 필요함`)
      entries.push({ ...c, char, radical: !!c.r, where, breakdown: parseParts(where, c.p), words: c.k ? parseWords(where, c.ex) : undefined })
    }
  }

  const seen = new Set()
  for (const e of entries) {
    const key = (e.radical ? 'r' : 'k') + e.char
    if (seen.has(key)) errors.push(`${e.where}: 같은 글자가 두 번 나옴`)
    seen.add(key)
  }

  const radicals = entries.filter((e) => e.radical)
  const kanji = entries.filter((e) => !e.radical)
  const cards = entries.map((e) => {
    const pool = e.radical ? radicals : kanji
    const id = cardId(e.radical ? 'r' : '', e.char)
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
          { mode: 'mcq', prompt: `“${e.m}”라는 뜻의 한자는?`, choices: [e.char, ...chars] },
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

  for (const card of cards) {
    for (const q of card.questions) {
      if (new Set(q.choices).size !== 4) errors.push(`${card.id}: 보기 중복 ${q.choices.join(' / ')}`)
    }
  }
  return cards
}

mkdirSync(OUT, { recursive: true })
const indexPath = join(OUT, 'index.json')
const previous = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf8')).packs : []
const index = []
for (const pack of PACKS) {
  const cards = await buildPack(pack)
  if (errors.length) break
  const body = JSON.stringify({ category: pack.category, version: 1, cards })
  const hash = createHash('sha1').update(body).digest('hex').slice(0, 12)
  const old = previous.find((p) => p.id === pack.id)
  const version = old ? (old.hash === hash ? old.version : old.version + 1) : 1
  const json = JSON.stringify({ category: pack.category, version, cards }) + '\n'
  writeFileSync(join(OUT, `${pack.id}.json`), json)
  index.push({ ...pack, version, hash, cards: cards.length, bytes: Buffer.byteLength(json) })
  const counts = Object.fromEntries(Object.values(DIFF).map((d) => [d, cards.filter((c) => c.difficulty === d).length]))
  console.log(`${pack.id}: ${cards.length}장 (쉬움 ${counts.easy} / 보통 ${counts.normal} / 어려움 ${counts.hard}) v${version}`)
}

if (errors.length) {
  for (const e of errors) console.error('✗', e)
  process.exit(1)
}
writeFileSync(indexPath, JSON.stringify({ packs: index }, null, 2) + '\n')
