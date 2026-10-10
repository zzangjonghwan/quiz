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
  | 'book' | 'film' | 'music' | 'art' | 'architecture' | 'sports'
  | 'trivia' | 'news' | 'tech'
  // Optional packs, downloaded from 설정 > 학습 팩.
  | 'kanji' | 'english'

/** One piece of a "쪼개기" breakdown: a character, word, or word root. */
export interface BreakdownPart {
  part: string
  /** Hanja or original-language spelling, e.g. 兎 or inflate. */
  origin?: string
  meaning: string
}

/** A kanji card's character, readings and example words (일본어 한자 팩). */
export interface KanjiInfo {
  char: string
  /** Korean hanja name and sound, e.g. "일할 노". Missing for kanji made in Japan. */
  ko?: string
  /** 음독 (on'yomi) in hiragana. */
  on?: string
  /** 훈독 (kun'yomi), okurigana in parentheses: "はたら(く)". */
  kun?: string
  words?: { word: string; reading: string; meaning: string }[]
}

/** An English word card's word, part of speech, example sentence and related words (영단어 팩). */
export interface WordInfo {
  text: string
  /** 품사, e.g. "동사". */
  pos?: string
  sentence?: { en: string; ko: string }
  /** Other words built on the same root. */
  related?: { word: string; meaning: string }[]
}

export interface Explanation {
  kanji?: KanjiInfo
  word?: WordInfo
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
  /** A character shown large under the prompt (kanji cards). */
  glyph?: string
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
  /** Data format version; an app skips 문제 업데이트 written for a newer one. */
  schema: number
  /** Hash of all the files' hashes. */
  id: string
  /** When the data last changed (ISO time); the newer of shipped and downloaded data wins. */
  built: string
  version: number
  /** A category may span several files (e.g. geo.json + geo.flags.json). */
  files: { category: CategoryId; file: string; version: number; hash: string }[]
}
