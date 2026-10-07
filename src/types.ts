export type Difficulty = 'easy' | 'normal' | 'hard'
export type DifficultyChoice = Difficulty | 'mixed'
export type CountChoice = 10 | 20 | 30 | 'infinite'
export type QuizMode = 'mcq' | 'subjective'
export type PlayStyle = 'normal' | 'game'

export type CategoryId =
  | 'idiom' | 'proverb' | 'korean' | 'slang' | 'loanword'
  | 'figure' | 'celeb' | 'koreanhistory' | 'worldhistory' | 'myth'
  | 'animal' | 'science' | 'geo'
  | 'life' | 'health' | 'food' | 'law' | 'economy'
  | 'book' | 'media' | 'sports'
  | 'trivia' | 'news' | 'tech'

/** One piece of a "쪼개기" breakdown: a character, word, or word root. */
export interface BreakdownPart {
  part: string
  /** Hanja or original-language spelling, e.g. 兎 or inflate. */
  origin?: string
  meaning: string
}

export interface Explanation {
  breakdown?: BreakdownPart[]
  /** Literal meaning after joining the breakdown ("합치면"). */
  literal?: string
  /** What it actually means / why this is the answer. Always present. */
  meaning: string
  origin?: string
  tip?: string
  bonus?: string
}

export interface McqQuestion {
  mode: 'mcq'
  prompt: string
  /** choices[0] is always the correct answer; the app shuffles them. */
  choices: [string, string, string, string]
}

export interface SubjectiveQuestion {
  mode: 'subjective'
  prompt: string
}

export type Question = McqQuestion | SubjectiveQuestion

export interface CardImage {
  /** Path under public/, e.g. "images/flags/kr.svg". */
  src: string
  alt: string
  /** Key into the image credits list (see src/credits.ts). */
  credit: string
  /** Flags and signs look best on white; silhouettes/stars draw their own background. */
  background?: 'light' | 'none'
}

/** A single fact. One card can be asked in several directions (questions). */
export interface Card {
  id: string
  difficulty: Difficulty
  /** Canonical short answer, used by subjective mode. */
  answer?: string
  aliases?: string[]
  questions: Question[]
  explanation: Explanation
  image?: CardImage
  /** "YYYY-MM" for facts that can go stale (news, celebs, numbers, laws). */
  asOf?: string
  sources?: string[]
}

export interface CategoryFile {
  category: CategoryId
  version: number
  cards: Card[]
}

export interface Manifest {
  version: number
  /** A category may span several files (e.g. geo.json + geo.flags.json). */
  files: { category: CategoryId; file: string; version: number }[]
}
