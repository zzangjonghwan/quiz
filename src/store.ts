// Persisted learning state: per-card progress, overall stats and settings.
// Kept in memory and saved to Capacitor Preferences (SharedPreferences on Android),
// which survives app updates and isn't evicted like WebView storage can be.
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { useSyncExternalStore } from 'react'
import type { SoundName } from './sound'
import type { CategoryId, CountChoice, DifficultyChoice, PlayStyle } from './types'

export interface CardProgress {
  /** Leitner box 0-5. 0 = never answered correctly yet. */
  box: number
  /** Timestamp (ms) when the card should be reviewed again. */
  due: number
  seen: number
  correct: number
  wrong: number
  last: number
  /** In the 오답노트 until answered correctly (without hints). */
  inNote: boolean
}

export interface Stats {
  answers: number
  correct: number
  streak: number
  bestStreak: number
  /** 게임 모드 기록. */
  bestScore: number
  bestCombo: number
}

export interface Settings {
  theme: 'dark' | 'light'
  haptics: boolean
  /** Categories left out of 종합. */
  excluded: CategoryId[]
  difficulty: DifficultyChoice
  count: CountChoice
  /** 일반 모드 or 게임 모드 (effects, score, sound). */
  play: PlayStyle
  sound: boolean
  /** Chosen variant id per sound effect (see src/sound.ts). */
  soundPicks: Partial<Record<SoundName, string>>
}

export interface StoreState {
  progress: Record<string, CardProgress>
  stats: Stats
  settings: Settings
}

const STORAGE_KEY = 'store-v1'
const DAY = 24 * 60 * 60 * 1000
/** Days until the next review, indexed by box. */
const REVIEW_DAYS = [0, 1, 3, 7, 21, 60]

const EMPTY_STATS: Stats = { answers: 0, correct: 0, streak: 0, bestStreak: 0, bestScore: 0, bestCombo: 0 }
const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  haptics: true,
  excluded: [],
  difficulty: 'mixed',
  count: 10,
  play: 'game',
  sound: true,
  soundPicks: {},
}

let state: StoreState = { progress: {}, stats: EMPTY_STATS, settings: DEFAULT_SETTINGS }
const listeners = new Set<() => void>()
let saveTimer: ReturnType<typeof setTimeout> | undefined

export async function loadStore() {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEY })
    if (value) {
      const saved = JSON.parse(value) as Partial<StoreState>
      state = {
        progress: saved.progress ?? {},
        stats: { ...EMPTY_STATS, ...saved.stats },
        settings: { ...DEFAULT_SETTINGS, ...saved.settings },
      }
    }
  } catch (e) {
    console.error('store load failed', e)
  }
  if (Capacitor.isNativePlatform()) {
    // Flush pending writes when the app goes to the background.
    void App.addListener('pause', () => void flush())
  }
}

async function flush() {
  clearTimeout(saveTimer)
  saveTimer = undefined
  await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(state) })
}

function commit(next: StoreState) {
  state = next
  for (const l of listeners) l()
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => void flush(), 400)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getState() {
  return state
}

export function useStore() {
  return useSyncExternalStore(subscribe, getState)
}

export interface AnswerSnapshot {
  cardId: string
  progress: CardProgress | undefined
  stats: Stats
}

/**
 * Applies one answer to the Leitner schedule. Returns a snapshot so the answer can be
 * replaced later (subjective mode's "맞은 걸로 할게요").
 */
export function recordAnswer(cardId: string, correct: boolean, hinted = false): AnswerSnapshot {
  const now = Date.now()
  const prev = state.progress[cardId]
  const p: CardProgress = prev
    ? { ...prev }
    : { box: 0, due: 0, seen: 0, correct: 0, wrong: 0, last: 0, inNote: false }
  p.seen++
  p.last = now
  if (correct) {
    p.correct++
    if (hinted) {
      // Solved with help: keep it coming back soon instead of promoting it.
      p.box = Math.max(p.box, 1)
      p.due = now + DAY
    } else {
      // Knowing a brand-new card on sight skips the early boxes.
      p.box = p.box === 0 ? 3 : Math.min(p.box + 1, 5)
      p.due = now + REVIEW_DAYS[p.box] * DAY
      p.inNote = false
    }
  } else {
    p.wrong++
    p.box = 1
    p.due = now + DAY
    p.inNote = true
  }

  const s = state.stats
  const streak = correct ? s.streak + 1 : 0
  const snapshot: AnswerSnapshot = { cardId, progress: prev, stats: s }
  commit({
    ...state,
    progress: { ...state.progress, [cardId]: p },
    stats: {
      ...s,
      answers: s.answers + 1,
      correct: s.correct + (correct ? 1 : 0),
      streak,
      bestStreak: Math.max(s.bestStreak, streak),
    },
  })
  return snapshot
}

/** Undoes a recorded answer, then records it again with a new verdict. */
export function replaceAnswer(snapshot: AnswerSnapshot, correct: boolean, hinted = false) {
  const progress = { ...state.progress }
  if (snapshot.progress) progress[snapshot.cardId] = snapshot.progress
  else delete progress[snapshot.cardId]
  state = { ...state, progress, stats: snapshot.stats }
  return recordAnswer(snapshot.cardId, correct, hinted)
}

export function removeFromNote(cardId: string) {
  const p = state.progress[cardId]
  if (!p?.inNote) return
  commit({ ...state, progress: { ...state.progress, [cardId]: { ...p, inNote: false } } })
}

export function updateSettings(patch: Partial<Settings>) {
  commit({ ...state, settings: { ...state.settings, ...patch } })
}

/** Records a finished game-mode session; returns true when it set a new best score. */
export function recordGame(score: number, maxCombo: number) {
  const s = state.stats
  const newBest = score > s.bestScore
  commit({
    ...state,
    stats: { ...s, bestScore: Math.max(s.bestScore, score), bestCombo: Math.max(s.bestCombo, maxCombo) },
  })
  return newBest
}

export function resetProgress() {
  commit({ ...state, progress: {}, stats: EMPTY_STATS })
}
