import { isTypeable, normalize } from './answer'
import type { QuestionBank } from './data'
import type { CardProgress } from './store'
import type { Card, CategoryId, CountChoice, DifficultyChoice, McqQuestion, QuizMode } from './types'

export interface SessionConfig {
  mode: QuizMode
  /** 'note' replays only cards in the 오답노트. */
  source: 'normal' | 'note'
  /** null means 종합 (every category not excluded in settings). */
  category: CategoryId | null
  difficulty: DifficultyChoice
  count: CountChoice
}

interface ItemBase {
  card: Card
  category: CategoryId
  prompt: string
}

export interface McqItem extends ItemBase {
  kind: 'mcq'
  /** Shuffled copy of the question's choices. */
  choices: string[]
  correctIndex: number
}

export interface SubjectiveItem extends ItemBase {
  kind: 'subjective'
  /** Canonical answer shown to the user. */
  answer: string
  accepted: string[]
}

export type SessionItem = McqItem | SubjectiveItem

export interface AnswerRecord {
  item: SessionItem
  correct: boolean
  pickedIndex?: number
  typed?: string
  hinted?: boolean
}

export interface PoolOptions {
  mode: QuizMode
  category: CategoryId | null
  difficulty: DifficultyChoice
  excluded: CategoryId[]
  /** Restrict to these card ids (오답노트). */
  only?: Set<string>
}

interface PoolEntry {
  card: Card
  category: CategoryId
  /** Ways this card can be asked in the chosen mode. */
  prompts: string[] | McqQuestion[]
}

function shuffle<T>(items: readonly T[]): T[] {
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

/**
 * Prompts usable in 주관식: explicit subjective questions, plus any multiple-choice question
 * whose correct choice is the card's short canonical answer ("…는 사자성어는?" → 토사구팽).
 */
export function subjectivePrompts(card: Card): string[] {
  if (!card.answer || !isTypeable(card.answer)) return []
  const target = normalize(card.answer)
  return card.questions
    .filter((q) => q.mode === 'subjective' || normalize(q.choices[0]) === target)
    .map((q) => q.prompt)
}

export function collectPool(bank: QuestionBank, o: PoolOptions): PoolEntry[] {
  const pool: PoolEntry[] = []
  for (const [category, cards] of bank) {
    if (o.category ? category !== o.category : o.excluded.includes(category)) continue
    for (const card of cards) {
      if (o.difficulty !== 'mixed' && card.difficulty !== o.difficulty) continue
      if (o.only && !o.only.has(card.id)) continue
      const prompts =
        o.mode === 'mcq'
          ? card.questions.filter((q): q is McqQuestion => q.mode === 'mcq')
          : subjectivePrompts(card)
      if (prompts.length) pool.push({ card, category, prompts })
    }
  }
  return pool
}

export interface PoolSummary {
  total: number
  fresh: number
  due: number
}

export function summarizePool(pool: PoolEntry[], progress: Record<string, CardProgress>, now = Date.now()): PoolSummary {
  let fresh = 0
  let due = 0
  for (const { card } of pool) {
    const p = progress[card.id]
    if (!p) fresh++
    else if (p.due <= now) due++
  }
  return { total: pool.length, fresh, due }
}

/**
 * Picks cards for a session: up to 30% due reviews, then unseen cards, then the rest of the
 * due reviews, then already-known cards whose review date is nearest. Each card appears once.
 */
export function buildSession(
  bank: QuestionBank,
  progress: Record<string, CardProgress>,
  config: SessionConfig,
  excluded: CategoryId[],
): SessionItem[] {
  const now = Date.now()
  const only =
    config.source === 'note'
      ? new Set(Object.entries(progress).filter(([, p]) => p.inNote).map(([id]) => id))
      : undefined
  // 종합 exclusions only shape normal play; the 오답노트 always shows everything in it.
  const pool = collectPool(bank, { ...config, excluded: only ? [] : excluded, only })
  const limit = config.count === 'infinite' ? pool.length : config.count

  let chosen: PoolEntry[]
  if (config.source === 'note') {
    chosen = shuffle(pool).slice(0, limit)
  } else {
    const due: PoolEntry[] = []
    const fresh: PoolEntry[] = []
    const known: PoolEntry[] = []
    for (const e of pool) {
      const p = progress[e.card.id]
      if (!p) fresh.push(e)
      else if (p.due <= now) due.push(e)
      else known.push(e)
    }
    const dueShuffled = shuffle(due)
    const reviewQuota = Math.ceil(limit * 0.3)
    known.sort((a, b) => progress[a.card.id].due - progress[b.card.id].due)
    chosen = [
      ...dueShuffled.slice(0, reviewQuota),
      ...shuffle(fresh),
      ...dueShuffled.slice(reviewQuota),
      ...known,
    ].slice(0, limit)
    chosen = shuffle(chosen)
  }

  return chosen.map(({ card, category, prompts }) => {
    if (config.mode === 'mcq') {
      const q = pick(prompts as McqQuestion[])
      const choices = shuffle(q.choices)
      return { kind: 'mcq', card, category, prompt: q.prompt, choices, correctIndex: choices.indexOf(q.choices[0]) }
    }
    const answer = card.answer!
    return {
      kind: 'subjective',
      card,
      category,
      prompt: pick(prompts as string[]),
      answer,
      accepted: [answer, ...(card.aliases ?? [])],
    }
  })
}

export function correctAnswerText(item: SessionItem) {
  return item.kind === 'mcq' ? item.choices[item.correctIndex] : item.answer
}
