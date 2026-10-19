// 단톡방에 내기: a question shared as an image carries a link to the web version (…/quiz/?q=<card>~<n>)
// that opens exactly that question, so friends can answer it without installing anything. If the
// card belongs to a 학습 팩 the friend doesn't have, the pack is read from the web just for it.
import { CATEGORY_BY_ID } from './categories'
import type { QuestionBank } from './data'
import { fetchPackCards } from './packs'
import type { McqItem, SessionItem } from './session'
import { splitLabel } from './marks'
import { WEB_URL } from './shareCard'
import type { Card, CategoryId, McqQuestion } from './types'

/** The question as asked (or the card's first multiple-choice question). */
function questionIndex(card: Card, item?: SessionItem) {
  const i = item ? card.questions.findIndex((q) => q.prompt === item.prompt && (q.mode !== 'mcq' || item.kind !== 'mcq' || q.glyph === item.glyph)) : -1
  return i >= 0 ? i : Math.max(0, card.questions.findIndex((q) => q.mode === 'mcq'))
}

export function questionLink(card: Card, item?: SessionItem) {
  return `${WEB_URL}?q=${encodeURIComponent(card.id)}~${questionIndex(card, item)}`
}

/**
 * The question and choices to draw, shuffled so the right answer isn't always first. Like in the
 * app, nothing that gives the answer away: no reading under a word or beside a choice.
 */
export function questionForCard(card: Card, item?: SessionItem) {
  const q = card.questions[questionIndex(card, item)]
  if (q.mode !== 'mcq') return { prompt: q.prompt, choices: [] }
  const choices = (item?.kind === 'mcq' ? item.choices : shuffle(q.choices)).map((c) => splitLabel(c).word)
  // A 듣기 question shows only its cue; the friend hears it from the link.
  if (q.listen) return { prompt: `[듣기] ${q.cue ? `${q.cue} · ` : ''}${q.prompt}`, choices }
  return { prompt: q.prompt, glyph: q.glyph, glyphSub: q.reveal ? undefined : q.glyphSub, choices }
}

function shuffle<T>(items: readonly T[]) {
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** The shared question in the page address, if any, ready to play as a one-question quiz. */
export async function sharedQuestion(bank: QuestionBank): Promise<McqItem | null> {
  const param = new URLSearchParams(location.search).get('q')
  if (!param) return null
  const [id, n] = param.split('~')
  const category = id.split('-')[0] as CategoryId
  if (!CATEGORY_BY_ID[category]) return null
  let card = bank.get(category)?.find((c) => c.id === id)
  if (!card) card = (await fetchPackCards(category).catch(() => [])).find((c) => c.id === id)
  const q = card?.questions[Number(n) || 0]
  if (!card || !q || q.mode !== 'mcq') return null
  const choices = shuffle((q as McqQuestion).choices)
  return {
    kind: 'mcq',
    card,
    category,
    prompt: q.prompt,
    glyph: q.glyph,
    glyphSub: q.glyphSub,
    audio: q.audio,
    reveal: q.reveal,
    listen: q.listen,
    cue: q.cue,
    ko: q.ko,
    choices,
    correctIndex: choices.indexOf(q.choices[0]),
  }
}

/** Takes the shared question out of the address once it has been opened. */
export function clearSharedQuestion() {
  if (location.search.includes('q=')) history.replaceState(null, '', location.pathname)
}
