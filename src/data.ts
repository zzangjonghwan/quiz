import { CATEGORY_BY_ID } from './categories'
import { loadInstalledPacks } from './packs'
import type { Card, CategoryId } from './types'
import { loadDataFiles } from './updates'

export type QuestionBank = Map<CategoryId, Card[]>

// Question data ships inside the app (public/data) so it works offline, and newer data downloaded by
// 문제 업데이트 (src/updates.ts) replaces it. Downloaded 학습 팩 (src/packs.ts) are added on top; call
// after loadStore(), which knows which packs are installed.
export async function loadBank(): Promise<QuestionBank> {
  const files = [...(await loadDataFiles()), ...(await loadInstalledPacks())]
  const bank: QuestionBank = new Map()
  for (const f of files) {
    // A category added by a later update needs a newer app to show it.
    if (!CATEGORY_BY_ID[f.category]) continue
    bank.set(f.category, [...(bank.get(f.category) ?? []), ...f.cards])
  }
  return bank
}

/** The question a card is best summarized by in lists (오답노트). */
export function headlinePrompt(card: Card) {
  const q = card.questions[0]
  return q.mode === 'mcq' && q.glyph ? `${q.glyph} · ${q.prompt}` : q.prompt
}

/** The card's answer as one line: its canonical answer, or the first question's correct choice. */
export function headlineAnswer(card: Card) {
  const first = card.questions[0]
  return card.answer ?? (first.mode === 'mcq' ? first.choices[0] : '')
}
