// One story player for the whole app. On Android it drives StoryPlaybackService through the
// StoryPlayer plugin (keeps playing with the screen off, lock-screen controls); in the browser
// it falls back to an <audio> element.
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { useSyncExternalStore } from 'react'
import { download, isDownloaded, playableUrl, type Story } from './stories'
import { getState as getStore, saveListening } from './store'

interface NativeState {
  position?: number
  duration?: number
  playing?: boolean
  buffering?: boolean
  ended?: boolean
  rate?: number
  error?: string
}

interface StoryPlayerPlugin {
  load(options: { url: string; title: string; artist: string; start: number; autoplay: boolean }): Promise<NativeState>
  play(): Promise<NativeState>
  pause(): Promise<NativeState>
  seek(options: { position: number }): Promise<NativeState>
  setRate(options: { rate: number }): Promise<NativeState>
  stop(): Promise<NativeState>
  getState(): Promise<NativeState>
  addListener(event: 'state', cb: (s: NativeState) => void): Promise<PluginListenerHandle>
}

const Native = registerPlugin<StoryPlayerPlugin>('StoryPlayer')
const native = Capacitor.isNativePlatform()

export interface PlayerState {
  story: Story | null
  playing: boolean
  buffering: boolean
  position: number
  duration: number
  rate: number
  error: string | null
}

let state: PlayerState = { story: null, playing: false, buffering: false, position: 0, duration: 0, rate: 1.1, error: null }
const listeners = new Set<() => void>()

function set(patch: Partial<PlayerState>) {
  state = { ...state, ...patch }
  for (const l of listeners) l()
}

export function usePlayer() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

let lastSaved = 0
/** Remembers where the listener is, at most every few seconds. */
function remember(force = false) {
  const { story, position, duration } = state
  if (!story || (!force && Date.now() - lastSaved < 4000)) return
  lastSaved = Date.now()
  const done = duration > 0 && position >= duration - 2
  saveListening(story.id, { position: done ? 0 : position, done: done || (getStore().listening[story.id]?.done ?? false) })
}

function apply(s: NativeState) {
  const patch: Partial<PlayerState> = {}
  if (s.position !== undefined) patch.position = s.position
  if (s.duration) patch.duration = s.duration
  if (s.playing !== undefined) patch.playing = s.playing
  if (s.buffering !== undefined) patch.buffering = s.buffering
  if (s.rate) patch.rate = s.rate
  if (s.error) patch.error = '재생하지 못했어요. 인터넷 연결을 확인해 주세요.'
  set(patch)
  if (s.ended && state.story) {
    saveListening(state.story.id, { position: 0, done: true })
  } else {
    remember()
  }
}

// ── Native engine ──
let poll: ReturnType<typeof setInterval> | undefined
let nativeListener: Promise<PluginListenerHandle> | undefined

function startPolling() {
  nativeListener ??= Native.addListener('state', apply)
  clearInterval(poll)
  poll = setInterval(() => {
    if (state.playing || state.buffering) void Native.getState().then(apply, () => {})
  }, 500)
}

// ── Web engine ──
let audio: HTMLAudioElement | null = null
function webAudio() {
  if (audio) return audio
  audio = new Audio()
  audio.preload = 'auto'
  const sync = () =>
    apply({
      position: audio!.currentTime,
      duration: Number.isFinite(audio!.duration) ? audio!.duration : 0,
      playing: !audio!.paused && !audio!.ended,
      ended: audio!.ended,
    })
  for (const ev of ['timeupdate', 'play', 'pause', 'ended', 'loadedmetadata', 'ratechange']) audio.addEventListener(ev, sync)
  audio.addEventListener('waiting', () => set({ buffering: true }))
  audio.addEventListener('playing', () => set({ buffering: false }))
  audio.addEventListener('error', () => set({ playing: false, buffering: false, error: '재생하지 못했어요. 인터넷 연결을 확인해 주세요.' }))
  return audio
}

/** Starts a story from where the listener left off (or from the start once finished). */
export async function playStory(story: Story, from?: number) {
  remember(true)
  const saved = getStore().listening[story.id]
  const start = from ?? (saved && !saved.done ? saved.position : 0)
  set({ story, playing: false, buffering: true, position: start, duration: story.duration, error: null })
  const url = await playableUrl(story)
  if (native) {
    startPolling()
    const s = await Native.load({ url, title: story.title, artist: '상식플러스 · arin', start, autoplay: true }).catch(
      () => ({ error: 'load' }) as NativeState,
    )
    apply(s)
    if (state.rate !== 1) void Native.setRate({ rate: state.rate })
    if (!(await isDownloaded(story))) void download(story)
  } else {
    const a = webAudio()
    a.src = url
    a.currentTime = start
    a.playbackRate = state.rate
    await a.play().catch(() => set({ buffering: false }))
  }
}

export function toggle() {
  if (!state.story) return
  if (state.playing) pause()
  else if (native) void Native.play().then(apply)
  else void webAudio().play()
}

export function pause() {
  if (native) void Native.pause().then(apply)
  else webAudio().pause()
  remember(true)
}

export function seek(position: number) {
  const p = Math.max(0, Math.min(position, state.duration || position))
  set({ position: p })
  if (native) void Native.seek({ position: p }).then(apply)
  else webAudio().currentTime = p
  remember(true)
}

export const skip = (delta: number) => seek(state.position + delta)

export function setRate(rate: number) {
  set({ rate })
  if (!state.story) return
  if (native) void Native.setRate({ rate }).then(apply)
  else webAudio().playbackRate = rate
}

export function stopStory() {
  remember(true)
  if (native) void Native.stop()
  else webAudio().pause()
  clearInterval(poll)
  set({ story: null, playing: false, buffering: false, position: 0, duration: 0, error: null })
}
