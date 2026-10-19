// Has GPT and Gemini review 상황 대답 scene cards before they ship: natural Japanese at the right
// level, faithful Korean, tips that are true, and wrong answers that really are wrong.
//
//   node scripts/review-scenes.mjs packs-src/jp-travel/03-spots.mjs
//
// Keys are read from ../agent/.env (OPENAI_API_KEY, GEMINI_API_KEY) and never printed. Findings go
// to .stories/review-<file>.json for a person to go through; nothing is changed automatically.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const ENV = join(ROOT, '..', 'agent', '.env')
const key = (name) => readFileSync(ENV, 'utf8').match(new RegExp(`^${name}\\s*=\\s*"?([^"\\r\\n]+)"?`, 'm'))?.[1]
const BATCH = 26

const PROMPT = `You review cards for a Japanese listening quiz for Korean beginners (JLPT N5–N4) who travel to Japan.
Each card: in place "p", a person "who" says Japanese line "a" (Korean translation "ak"); the learner's correct reply is "b" ("bk").
"w" are wrong replies (they must be clearly wrong or unnatural as a reply to "a", never an acceptable answer). "t" is a Korean tip with a fact about the place or custom.
Check every card for:
1. Japanese naturalness and correctness in a, b and w (grammar, politeness level that fits who is speaking, what a real person would say there).
2. Translation accuracy of ak and bk (natural Korean).
3. Whether b is a natural, correct reply to a.
4. Whether any w could actually be an acceptable reply to a (that is a bug).
5. Factual accuracy of t (prices, places, customs, names). Flag anything wrong or likely outdated as of 2026.
6. Level: words far above N4 that a beginner could not follow.
Report only real problems. Reply as JSON: {"issues":[{"a":"<the card's a, exactly>","field":"a|ak|b|bk|w|t|level","problem":"<Korean, short>","fix":"<suggested replacement text>"}]}. If a card is fine, leave it out.`

async function gpt(cards) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key('OPENAI_API_KEY')}` },
    body: JSON.stringify({
      model: 'gpt-6-luna',
      reasoning_effort: 'high',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: PROMPT },
        { role: 'user', content: JSON.stringify(cards, null, 1) },
      ],
    }),
    signal: AbortSignal.timeout(600_000),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`GPT ${res.status}: ${data.error?.message ?? ''}`.slice(0, 200))
  return JSON.parse(data.choices[0].message.content).issues ?? []
}

async function gemini(cards) {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key('GEMINI_API_KEY') },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${PROMPT}\n\n${JSON.stringify(cards, null, 1)}` }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
    signal: AbortSignal.timeout(600_000),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${JSON.stringify(data).slice(0, 200)}`)
  const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('')
  return JSON.parse(text).issues ?? []
}

const file = resolve(process.argv[2])
const cards = (await import(pathToFileURL(file).href)).default.cards.map(({ p, who, a, ak, b, bk, w, t }) => ({ p, who, a, ak, b, bk, w, t }))
const out = { gpt: [], gemini: [] }
for (let i = 0; i < cards.length; i += BATCH) {
  const batch = cards.slice(i, i + BATCH)
  const [g, m] = await Promise.allSettled([gpt(batch), gemini(batch)])
  if (g.status === 'fulfilled') out.gpt.push(...g.value)
  else console.warn(String(g.reason).slice(0, 200))
  if (m.status === 'fulfilled') out.gemini.push(...m.value)
  else console.warn(String(m.reason).slice(0, 200))
  console.log(`${Math.min(i + BATCH, cards.length)}/${cards.length}: GPT ${out.gpt.length}건, Gemini ${out.gemini.length}건`)
}
const dir = join(ROOT, '.stories')
if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
const dest = join(dir, `review-${basename(file, '.mjs')}.json`)
writeFileSync(dest, JSON.stringify(out, null, 2))
console.log(`✓ ${dest}`)
