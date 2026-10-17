// 문제 형식: for the Japanese packs, players pick which kinds of question to leave out before
// starting, instead of a difficulty. Each question carries one of these as its `skill`
// (scripts/build-packs.mjs).
import type { CategoryId } from './types'

export interface QuestionFormat {
  id: string
  label: string
}

const WORDS: QuestionFormat[] = [
  { id: 'meaning', label: '뜻 맞히기' },
  { id: 'word', label: '일본어 고르기' },
  { id: 'bridge', label: '소리 다리' },
  { id: 'blank', label: '빈칸 채우기' },
]
const LISTENING: QuestionFormat[] = [
  { id: 'listen', label: '듣고 뜻 고르기' },
  { id: 'scene', label: '상황 대답' },
]

export const FORMATS: Partial<Record<CategoryId, QuestionFormat[]>> = {
  japanese: WORDS,
  japanese3: WORDS,
  listening: LISTENING,
  listening3: LISTENING,
  travel: [
    { id: 'meaning', label: '뜻 맞히기' },
    { id: 'word', label: '일본어 고르기' },
    { id: 'listen', label: '듣고 뜻 고르기' },
    { id: 'scene', label: '상황 대답' },
  ],
}
