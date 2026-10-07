// Validates every question file in public/data and regenerates manifest.json.
// Runs before each build (npm run build), so broken data fails CI instead of the app.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DATA_DIR = fileURLToPath(new URL('../public/data/', import.meta.url))

// Same order as src/categories.ts.
const CATEGORIES = [
  'idiom', 'proverb', 'korean', 'slang', 'loanword',
  'figure', 'celeb', 'koreanhistory', 'worldhistory', 'myth',
  'animal', 'science', 'geo',
  'life', 'health', 'food', 'law', 'economy',
  'book', 'media', 'sports',
  'trivia', 'news', 'tech',
]
const DIFFICULTIES = ['easy', 'normal', 'hard']

const errors = []
const warnings = []
const seenIds = new Set()
const seenPrompts = new Map()
const manifest = { version: 0, categories: [] }
const summary = []

const isText = (v) => typeof v === 'string' && v.trim().length > 0

for (const category of CATEGORIES) {
  const file = `${category}.json`
  let data
  try {
    data = JSON.parse(readFileSync(join(DATA_DIR, file), 'utf-8'))
  } catch (e) {
    if (e.code === 'ENOENT') {
      warnings.push(`${file}: 파일 없음 (카테고리가 비어 있음)`)
      continue
    }
    errors.push(`${file}: JSON 파싱 실패 - ${e.message}`)
    continue
  }

  const err = (msg) => errors.push(`${file}: ${msg}`)
  if (data.category !== category) err(`category가 "${category}"가 아님`)
  if (!Number.isInteger(data.version) || data.version < 1) err('version은 1 이상의 정수')
  if (!Array.isArray(data.cards)) {
    err('cards 배열 없음')
    continue
  }

  const counts = { easy: 0, normal: 0, hard: 0 }
  for (const [i, card] of data.cards.entries()) {
    const where = card?.id ?? `#${i}`
    const cerr = (msg) => err(`${where}: ${msg}`)

    if (!isText(card.id)) cerr('id 없음')
    else if (!card.id.startsWith(`${category}-`)) cerr(`id는 "${category}-"로 시작해야 함`)
    else if (seenIds.has(card.id)) cerr('id 중복')
    seenIds.add(card.id)

    if (!DIFFICULTIES.includes(card.difficulty)) cerr(`difficulty 값 이상: ${card.difficulty}`)
    else counts[card.difficulty]++

    if (card.answer !== undefined && !isText(card.answer)) cerr('answer가 빈 문자열')
    if (card.aliases !== undefined && !(Array.isArray(card.aliases) && card.aliases.every(isText)))
      cerr('aliases는 문자열 배열')
    if (card.asOf !== undefined && !/^\d{4}-(0[1-9]|1[0-2])$/.test(card.asOf)) cerr('asOf는 YYYY-MM')

    if (!Array.isArray(card.questions) || card.questions.length === 0) cerr('questions 없음')
    for (const q of card.questions ?? []) {
      if (!isText(q.prompt)) cerr('prompt 없음')
      // Generic prompts ("맞춤법이 바른 것은?") may repeat; the same prompt with the same choices may not.
      const key = `${q.prompt?.trim()}|${[...(q.choices ?? [])].sort().join('|')}`
      if (seenPrompts.has(key)) cerr(`같은 문제가 ${seenPrompts.get(key)}에도 있음`)
      seenPrompts.set(key, card.id)

      if (q.mode === 'mcq') {
        if (!Array.isArray(q.choices) || q.choices.length !== 4) {
          cerr('mcq 보기는 정확히 4개')
          continue
        }
        if (!q.choices.every(isText)) cerr('빈 보기 있음')
        const normalized = q.choices.map((c) => String(c).replace(/\s+/g, ''))
        if (new Set(normalized).size !== 4) cerr(`보기 중복: ${q.choices.join(' / ')}`)
        // The correct answer standing out by length is a giveaway.
        const [right, ...wrong] = q.choices.map((c) => String(c).length)
        if (right > 12 && right > Math.max(...wrong) * 1.8)
          warnings.push(`${file}: ${where}: 정답 보기가 유독 길어 티가 남`)
      } else if (q.mode !== 'subjective') {
        cerr(`mode 값 이상: ${q.mode}`)
      }
    }

    const e = card.explanation
    if (!e || !isText(e.meaning)) cerr('explanation.meaning 없음')
    for (const b of e?.breakdown ?? []) {
      if (!isText(b.part) || !isText(b.meaning)) cerr('breakdown 항목에 part/meaning 없음')
    }
    for (const field of ['literal', 'origin', 'tip', 'bonus']) {
      if (e?.[field] !== undefined && !isText(e[field])) cerr(`explanation.${field}가 빈 값`)
    }
  }

  manifest.categories.push({ id: category, file, version: data.version })
  manifest.version += data.version
  summary.push(
    `${category.padEnd(14)} ${String(data.cards.length).padStart(4)}  (쉬움 ${counts.easy} / 보통 ${counts.normal} / 어려움 ${counts.hard})`,
  )
}

for (const w of warnings) console.warn('⚠', w)
if (errors.length) {
  for (const e of errors) console.error('✗', e)
  console.error(`\n데이터 오류 ${errors.length}건`)
  process.exit(1)
}

writeFileSync(join(DATA_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(summary.join('\n'))
console.log(`\n✓ 카드 ${seenIds.size}개 검증 완료, manifest.json 갱신`)
