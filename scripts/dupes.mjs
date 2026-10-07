// Lists cards in the given data files whose answer already appears elsewhere, so a new batch can be
// checked for repeats before it ships (same fact asked twice, often across categories).
//
//   node scripts/dupes.mjs art.m2 film.m2     (names as in public/data/<name>.json)
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DATA = fileURLToPath(new URL('../public/data/', import.meta.url))
const norm = (s) => String(s).replace(/\(.*?\)|[\s'"「」『』·.,!?~-]/g, '').toLowerCase()
const targets = new Set(process.argv.slice(2).map((n) => `${n}.json`))

const all = []
for (const f of readdirSync(DATA).filter((f) => f.endsWith('.json') && f !== 'manifest.json' && f !== 'stories.json')) {
  for (const c of JSON.parse(readFileSync(join(DATA, f), 'utf8')).cards) all.push({ file: f, card: c, key: norm(c.answer) })
}
const byKey = new Map()
for (const x of all) byKey.set(x.key, [...(byKey.get(x.key) ?? []), x])

let found = 0
for (const x of all.filter((x) => targets.has(x.file))) {
  const others = byKey.get(x.key).filter((o) => o !== x)
  if (!others.length) continue
  found++
  console.log(`\n[${x.file}] ${x.card.answer} — ${x.card.questions[0].prompt}`)
  for (const o of others) console.log(`   ↔ [${o.file}] ${o.card.questions[0].prompt}`)
}
console.log(`\n같은 정답 ${found}개`)
