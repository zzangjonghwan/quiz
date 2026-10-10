// 문제 신고: opens a Google Form with the question already filled in, so people can point out a
// wrong answer or a typo without the app collecting anything itself.
import { headlineAnswer, headlinePrompt } from './data'
import type { SessionItem } from './session'
import type { Card } from './types'

/**
 * The form's 미리 채워진 링크 (⋮ > 미리 채워진 링크 가져오기) with "QID" typed into 문제 번호 and
 * "QTEXT" into 문제 내용. Empty until the form exists, which hides the button.
 */
const FORM = ''

export const canReport = FORM !== ''

/** The question as the person saw it (or the card's first question), with its answer. */
function describe(card: Card, item?: SessionItem) {
  if (!item) return `${headlinePrompt(card)}\n정답: ${headlineAnswer(card)}`
  const prompt = item.kind === 'mcq' && item.glyph ? `${item.glyph} · ${item.prompt}` : item.prompt
  if (item.kind === 'subjective') return `${prompt}\n정답: ${item.answer}`
  return `${prompt}\n보기: ${item.choices.join(' / ')}\n정답: ${item.choices[item.correctIndex]}`
}

export function reportUrl(card: Card, item?: SessionItem) {
  return FORM.replace('QID', encodeURIComponent(card.id)).replace('QTEXT', encodeURIComponent(describe(card, item)))
}
