import type { QuestionBank } from './data'
import type { Card, CategoryId, Difficulty, McqQuestion } from './types'

export type DifficultyChoice = Difficulty | 'mixed'
export type CountChoice = 10 | 20 | 30 | 'infinite'

export interface SessionConfig {
  /** null means 종합 (every category). */
  category: CategoryId | null
  difficulty: DifficultyChoice
  count: CountChoice
}

export interface SessionItem {
  card: Card
  category: CategoryId
  question: McqQuestion
  /** Shuffled copy of question.choices. */
  choices: string[]
  correctIndex: number
}

export interface AnswerRecord {
  item: SessionItem
  pickedIndex: number
  correct: boolean
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

/** Number of cards a config can draw from, used to show counts before starting. */
export function poolSize(bank: QuestionBank, category: CategoryId | null, difficulty: DifficultyChoice) {
  return collectPool(bank, category, difficulty).length
}

function collectPool(bank: QuestionBank, category: CategoryId | null, difficulty: DifficultyChoice) {
  const pool: { card: Card; category: CategoryId; mcqs: McqQuestion[] }[] = []
  for (const [cat, cards] of bank) {
    if (category && cat !== category) continue
    for (const card of cards) {
      if (difficulty !== 'mixed' && card.difficulty !== difficulty) continue
      const mcqs = card.questions.filter((q): q is McqQuestion => q.mode === 'mcq')
      if (mcqs.length) pool.push({ card, category: cat, mcqs })
    }
  }
  return pool
}

// Each card appears at most once per session, asked in one randomly chosen direction.
export function buildSession(bank: QuestionBank, config: SessionConfig): SessionItem[] {
  const pool = shuffle(collectPool(bank, config.category, config.difficulty))
  const picked = config.count === 'infinite' ? pool : pool.slice(0, config.count)
  return picked.map(({ card, category, mcqs }) => {
    const question = pick(mcqs)
    const choices = shuffle(question.choices)
    return { card, category, question, choices, correctIndex: choices.indexOf(question.choices[0]) }
  })
}
