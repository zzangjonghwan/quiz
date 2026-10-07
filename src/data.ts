import type { Card, CategoryFile, CategoryId, Manifest } from './types'

export type QuestionBank = Map<CategoryId, Card[]>

// Question data ships inside the app (public/data) so it works offline.
// M5 will layer downloaded updates on top of this.
const DATA_BASE = './data/'

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(DATA_BASE + path)
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export async function loadBank(): Promise<QuestionBank> {
  const manifest = await fetchJson<Manifest>('manifest.json')
  const files = await Promise.all(manifest.files.map((f) => fetchJson<CategoryFile>(f.file)))
  const bank: QuestionBank = new Map()
  for (const f of files) bank.set(f.category, [...(bank.get(f.category) ?? []), ...f.cards])
  return bank
}

/** The question a card is best summarized by in lists (오답노트). */
export function headlinePrompt(card: Card) {
  return card.questions[0].prompt
}

/** The card's answer as one line: its canonical answer, or the first question's correct choice. */
export function headlineAnswer(card: Card) {
  const first = card.questions[0]
  return card.answer ?? (first.mode === 'mcq' ? first.choices[0] : '')
}
