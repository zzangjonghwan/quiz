// Asks Gemini to double-check questions whose mistakes would matter most (건강·법률·경제·시사 by
// default) and writes the ones it doubts to .stories/factcheck.json for a person to review.
// Nothing is changed automatically: fix the flagged cards in content/*.mjs, then `npm run content`.
//
//   node scripts/factcheck.mjs                    health law economy news
//   node scripts/factcheck.mjs economy law        only these categories
//
// 시사 is checked with Google Search grounding, since its facts are recent. The key is read from
// GEMINI_API_KEY, .env.local or ../agent/.env and never written anywhere.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const DATA = join(ROOT, 'public', 'data')
const OUT = join(ROOT, '.stories', 'factcheck.json')
const MODEL = 'gemini-3.8-flash'
const BATCH = 20
const SEARCH = new Set(['news'])

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

const categories = process.argv.slice(2).length ? process.argv.slice(2) : ['health', 'law', 'economy', 'news']
const manifest = JSON.parse(readFileSync(join(DATA, 'manifest.json'), 'utf8'))

/** A card as the checker sees it: every question with its right answer, and the explanation. */
function describe(card) {
  const e = card.explanation
  return {
    id: card.id,
    ...(card.asOf && { 기준시점: card.asOf }),
    문제: card.questions.map((q) =>
      q.mode === 'mcq' ? { 질문: q.prompt, 정답: q.choices[0], 오답: q.choices.slice(1) } : { 질문: q.prompt, 정답: card.answer },
    ),
    해설: [e.literal, e.meaning, e.origin, e.tip, e.bonus].filter(Boolean).join(' / '),
  }
}

const PROMPT = `다음은 한국 20대를 위한 상식 퀴즈 문제들이야. 사실 확인 담당자로서 꼼꼼히 검토해 줘.
문제로 볼 것:
- 정답이 틀렸다
- 오답 보기 중에 정답으로 볼 수 있는 것이 있다 (정답이 둘 이상)
- 해설에 사실 오류가 있다 (숫자, 연도, 이름, 법 조항, 제도 내용 등)
- 지금(2026년 10월) 한국 기준으로 바뀌어서 더는 맞지 않는다
- 건강·법률 정보가 위험할 정도로 단순화되었다
문체나 사소한 표현은 문제 삼지 마. 확실하지 않으면 "doubtful"로 표시해.
문제가 있는 것만 JSON 배열로 답해(없으면 []): [{"id": "...", "verdict": "wrong" | "doubtful", "reason": "무엇이 왜 틀렸는지 한국어로 짧게", "fix": "어떻게 고치면 되는지"}]`

async function check(cards, search) {
  const body = {
    contents: [{ parts: [{ text: `${PROMPT}\n\n${JSON.stringify(cards.map(describe), null, 1)}` }] }],
    generationConfig: search ? {} : { responseMimeType: 'application/json' },
    ...(search && { tools: [{ google_search: {} }] }),
  }
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 10_000 * attempt))
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(300_000),
    }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }))
    if (!res.ok) {
      console.warn(`  HTTP ${res.status} ${(await res.text()).slice(0, 150)}`)
      continue
    }
    const text = ((await res.json()).candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('')
    const json = text.slice(text.indexOf('['), text.lastIndexOf(']') + 1)
    try {
      return JSON.parse(json || '[]')
    } catch {
      console.warn(`  읽을 수 없는 답: ${text.slice(0, 150)}`)
    }
  }
  throw new Error('검토 요청이 계속 실패했어요')
}

const previous = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {}
const flagged = { ...previous }
for (const category of categories) {
  const cards = manifest.files
    .filter((f) => f.category === category)
    .flatMap((f) => JSON.parse(readFileSync(join(DATA, f.file), 'utf8')).cards)
  // Re-runs skip cards already looked at, unless the file was cleared.
  const done = new Set(Object.values(flagged).flat().map((x) => x.id).concat(previous[`${category}:checked`] ?? []))
  const todo = cards.filter((c) => !done.has(c.id))
  console.log(`${category}: ${todo.length}/${cards.length}개 검토`)
  const checked = previous[`${category}:checked`] ?? []
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH)
    const found = await check(batch, SEARCH.has(category))
    const known = new Set(batch.map((c) => c.id))
    flagged[category] = [...(flagged[category] ?? []), ...found.filter((f) => known.has(f.id))]
    checked.push(...batch.map((c) => c.id))
    flagged[`${category}:checked`] = checked
    writeFileSync(OUT, JSON.stringify(flagged, null, 1))
    process.stdout.write(`  ${Math.min(i + BATCH, todo.length)}/${todo.length} (의심 ${flagged[category].length})\n`)
  }
}
const total = categories.reduce((n, c) => n + (flagged[c]?.length ?? 0), 0)
console.log(`✓ 의심 ${total}개 → ${OUT}`)
