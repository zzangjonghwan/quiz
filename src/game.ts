// 게임 모드 scoring rules.
import type { QuizMode } from './types'

export interface GameResult {
  score: number
  maxCombo: number
}

/** 0 = no fire, 1-3 = how strongly the screen burns. */
export function comboLevel(combo: number) {
  return combo >= 10 ? 3 : combo >= 5 ? 2 : combo >= 3 ? 1 : 0
}

/** Combos that get a banner, a sound and extra fireworks. */
export function isMilestone(combo: number) {
  return combo === 3 || combo === 5 || combo === 10 || (combo > 10 && combo % 5 === 0)
}

/** Base 100 (주관식 150), +10 per combo step up to +100. Hints halve it. */
export function pointsFor(combo: number, mode: QuizMode, hinted = false) {
  const base = mode === 'subjective' ? 150 : 100
  const points = base + Math.min(Math.max(combo - 1, 0), 10) * 10
  return hinted ? Math.round(points / 2) : points
}
