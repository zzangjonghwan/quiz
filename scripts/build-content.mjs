// Expands the compact sources in content/*.mjs into public/data/<category>.<name>.json.
// Run with `npm run content` (also validates). Output is committed like other data.
//
// Card shapes in a content file (short keys keep thousands of cards readable):
//
//   Term card (no `q`): a word/phrase and its meaning. Produces two questions:
//     "'a'의 뜻으로 알맞은 것은?"  and  "“m”라는 뜻의 <label>은/는?"
//     Wrong choices are drawn from other term cards in the same file unless given.
//     { a: '토사구팽', h: '兎死狗烹', d: 'n', m: '…', b: '토끼/죽다/개/삶다', l, o, t, x,
//       k: '관용구' (label override), syn: ['일거양득'] (never use as a wrong choice),
//       wm: [3 wrong meanings], wa: [3 wrong answers], al: [aliases] }
//
//   Fact card (has `q`): one multiple-choice question with hand-written wrong choices.
//     { q: '질문', a: '정답', w: ['오답1', '오답2', '오답3'], d: 'e', m: '해설', b, l, o, t, x, al, asOf }
//
//   b (breakdown): "part=meaning / part(origin)=meaning", or for hanja terms with `h`,
//   just the meanings "토끼/죽다/개/삶다" zipped with the characters of `a` and `h`.
//   d: e | n | h  →  easy | normal | hard
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const CONTENT = join(ROOT, 'content')
const DATA = join(ROOT, 'public', 'data')
const DIFF = { e: 'easy', n: 'normal', h: 'hard' }

const errors = []

/** 은/는, 이/가 … picked by whether the last syllable has a final consonant. */
function josa(word, pair) {
  const [withBatchim, without] = pair.split('/')
  const last = word.trim().slice(-1)
  const code = last.charCodeAt(0) - 0xac00
  if (code < 0 || code > 11171) return /[0-9a-zA-Z]$/.test(last) ? without : withBatchim
  return code % 28 ? withBatchim : without
}

const norm = (s) => String(s).replace(/\s+/g, '').toLowerCase()

/** Stable pseudo-random order so regenerating doesn't reshuffle every wrong choice. */
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

function parseBreakdown(card) {
  if (!card.b) return undefined
  if (card.h && !card.b.includes('=')) {
    const meanings = card.b.split('/').map((s) => s.trim())
    const chars = [...card.a.replace(/\s/g, '')]
    const hanja = [...card.h]
    if (meanings.length !== chars.length || hanja.length !== chars.length)
      errors.push(`${card.a}: 글자 수(${chars.length})와 한자(${hanja.length})·뜻(${meanings.length}) 개수가 다름`)
    return chars.map((part, i) => ({ part, origin: hanja[i], meaning: meanings[i] ?? '' }))
  }
  return card.b.split(' / ').map((entry) => {
    const [left, ...rest] = entry.split('=')
    const meaning = rest.join('=').trim()
    const m = left.trim().match(/^(.*?)\((.*)\)$/)
    return m ? { part: m[1].trim(), origin: m[2].trim(), meaning } : { part: left.trim(), meaning }
  })
}

function explanation(card) {
  return {
    ...(card.b && { breakdown: parseBreakdown(card) }),
    ...(card.l && { literal: card.l }),
    meaning: card.m,
    ...(card.o && { origin: card.o }),
    ...(card.t && { tip: card.t }),
    ...(card.x && { bonus: card.x }),
  }
}

/** Picks 3 wrong values from siblings, preferring the same difficulty. */
function pickWrong(card, siblings, field, seed) {
  const avoid = new Set([card.a, ...(card.syn ?? []), ...(card.al ?? [])].map(norm))
  const pool = siblings.filter((s) => s !== card && !avoid.has(norm(s.a)) && !(s.syn ?? []).map(norm).includes(norm(card.a)))
  const same = seededShuffle(pool.filter((s) => s.d === card.d), seed)
  const other = seededShuffle(pool.filter((s) => s.d !== card.d), seed)
  // Similar length first, so the right answer doesn't stand out by being longer or shorter.
  const target = card[field].length
  const bucket = (s) => Math.round(Math.abs(s[field].length - target) / Math.max(target, 1) / 0.25)
  const ordered = [...same, ...other]
    .map((s, i) => ({ s, i, b: bucket(s) }))
    .sort((x, y) => x.b - y.b || x.i - y.i)
    .map((x) => x.s)
  const picked = []
  const seen = new Set([norm(card[field])])
  for (const s of ordered) {
    if (seen.has(norm(s[field]))) continue
    seen.add(norm(s[field]))
    picked.push(s[field])
    if (picked.length === 3) break
  }
  return picked
}

function build(file, mod) {
  const { category, name, label, cards } = mod
  const terms = cards.filter((c) => !c.q)
  return cards.map((c, i) => {
    const id = `${category}-${name}${String(i + 1).padStart(3, '0')}`
    if (!DIFF[c.d]) errors.push(`${file} ${id}: d는 e/n/h`)
    if (!c.a || !c.m) errors.push(`${file} ${id}: a와 m은 필수`)
    const base = {
      id,
      difficulty: DIFF[c.d],
      answer: c.a,
      ...(c.al && { aliases: c.al }),
      ...((c.asOf ?? mod.asOf) && { asOf: c.asOf ?? mod.asOf }),
    }
    if (c.q) {
      if (!Array.isArray(c.w) || c.w.length !== 3) errors.push(`${file} ${id}: w는 오답 3개`)
      return { ...base, questions: [{ mode: 'mcq', prompt: c.q, choices: [c.a, ...(c.w ?? [])] }], explanation: explanation(c) }
    }
    const kind = c.k ?? label
    if (!kind) errors.push(`${file} ${id}: 용어 카드에 label(또는 k)이 필요함`)
    if (norm(c.m).includes(norm(c.a))) errors.push(`${file} ${id}: 뜻(m)에 정답이 들어 있음`)
    const wrongMeanings = c.wm ?? pickWrong(c, terms, 'm', id + 'm')
    const wrongAnswers = c.wa ?? pickWrong(c, terms.filter((s) => (s.k ?? label) === kind), 'a', id + 'a')
    if (wrongMeanings.length < 3 || wrongAnswers.length < 3) errors.push(`${file} ${id}: 오답 후보 부족`)
    return {
      ...base,
      questions: [
        { mode: 'mcq', prompt: `'${c.a}'의 뜻으로 알맞은 것은?`, choices: [c.m, ...wrongMeanings] },
        { mode: 'mcq', prompt: `“${c.m}”라는 뜻의 ${kind}${josa(kind, '은/는')}?`, choices: [c.a, ...wrongAnswers] },
      ],
      explanation: explanation(c),
    }
  })
}

/** Answers already used by hand-written data, so content files don't repeat them. */
function existingAnswers(category, exceptFile) {
  const answers = new Set()
  for (const f of readdirSync(DATA)) {
    if (f === exceptFile || !(f === `${category}.json` || f.startsWith(`${category}.`))) continue
    for (const card of JSON.parse(readFileSync(join(DATA, f), 'utf-8')).cards) if (card.answer) answers.add(norm(card.answer))
  }
  return answers
}

const only = process.argv[2]
for (const file of readdirSync(CONTENT).filter((f) => f.endsWith('.mjs')).sort()) {
  if (only && !file.startsWith(only)) continue
  const mod = (await import(pathToFileURL(join(CONTENT, file)).href)).default
  const out = `${mod.category}.${mod.name}.json`
  const existing = existingAnswers(mod.category, out)
  const seen = new Set()
  for (const c of mod.cards) {
    const key = norm(c.a)
    if (!c.q && existing.has(key)) errors.push(`${file}: '${c.a}'는 이미 다른 파일에 있음`)
    if (!c.q && seen.has(key)) errors.push(`${file}: '${c.a}' 중복`)
    seen.add(key)
  }
  const cards = build(file, mod)
  writeFileSync(join(DATA, out), JSON.stringify({ category: mod.category, version: 1, cards }, null, 2) + '\n')
  console.log(`${file} → ${out}: ${cards.length}장`)
}

if (errors.length) {
  for (const e of errors) console.error('✗', e)
  process.exit(1)
}
