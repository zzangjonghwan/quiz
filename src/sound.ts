// Sound effects synthesized with the Web Audio API: no audio files to ship or license.
// Each effect has a few variants; the player picks one in 설정 > 효과음 고르기.
import { getState } from './store'

export type SoundName = 'correct' | 'wrong' | 'combo' | 'fanfare' | 'tap'

let ctx: AudioContext | null = null
let noiseBuffer: AudioBuffer | null = null

function audio() {
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function noise(c: AudioContext) {
  if (!noiseBuffer) {
    noiseBuffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  return noiseBuffer
}

interface ToneOptions {
  type?: OscillatorType
  at?: number
  dur: number
  freq: number
  /** Glide to this frequency over the tone's duration. */
  to?: number
  gain?: number
  attack?: number
}

function tone({ type = 'sine', at = 0, dur, freq, to, gain = 0.3, attack = 0.005 }: ToneOptions) {
  const c = audio()
  const t = c.currentTime + at
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g).connect(c.destination)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

interface NoiseOptions {
  at?: number
  dur: number
  gain?: number
  filter?: BiquadFilterType
  freq: number
  /** Sweep the filter to this frequency. */
  to?: number
  q?: number
}

function burst({ at = 0, dur, gain = 0.3, filter = 'lowpass', freq, to, q = 1 }: NoiseOptions) {
  const c = audio()
  const t = c.currentTime + at
  const src = c.createBufferSource()
  src.buffer = noise(c)
  const f = c.createBiquadFilter()
  f.type = filter
  f.Q.value = q
  f.frequency.setValueAtTime(freq, t)
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(c.destination)
  src.start(t, Math.random())
  src.stop(t + dur + 0.05)
}

export interface Variant {
  id: string
  label: string
  play: () => void
}

export const SOUND_LABEL: Record<SoundName, string> = {
  correct: '정답',
  wrong: '오답 (와르르)',
  combo: '연속 정답 불꽃',
  fanfare: '결과 발표',
  tap: '버튼 터치',
}

export const VARIANTS: Record<SoundName, Variant[]> = {
  correct: [
    {
      id: 'chime',
      label: '맑은 딩동',
      play: () => {
        tone({ freq: 1046.5, dur: 0.35, gain: 0.25 })
        tone({ freq: 1568, at: 0.09, dur: 0.5, gain: 0.22 })
      },
    },
    {
      id: 'coin',
      label: '오락실 코인',
      play: () => {
        tone({ type: 'square', freq: 988, dur: 0.08, gain: 0.12 })
        tone({ type: 'square', freq: 1319, at: 0.07, dur: 0.3, gain: 0.12 })
      },
    },
    {
      id: 'sparkle',
      label: '반짝 상승',
      play: () => {
        ;[784, 988, 1175, 1568].forEach((f, i) => tone({ type: 'triangle', freq: f, at: i * 0.05, dur: 0.25, gain: 0.18 }))
        burst({ at: 0.15, dur: 0.3, filter: 'highpass', freq: 6000, gain: 0.05 })
      },
    },
  ],
  wrong: [
    {
      id: 'rumble',
      label: '쿠구궁 무너짐',
      play: () => {
        // Low rumble, a crack, then the heavy thud of the falling half.
        burst({ dur: 0.9, freq: 400, to: 60, gain: 0.5 })
        burst({ at: 0.02, dur: 0.12, filter: 'bandpass', freq: 2500, q: 0.7, gain: 0.25 })
        tone({ freq: 90, to: 35, at: 0.25, dur: 0.6, gain: 0.5 })
        burst({ at: 0.3, dur: 0.25, filter: 'bandpass', freq: 900, q: 1.5, gain: 0.15 })
      },
    },
    {
      id: 'crash',
      label: '와장창 깨짐',
      play: () => {
        burst({ dur: 0.5, filter: 'highpass', freq: 3000, to: 1200, gain: 0.3 })
        ;[0.05, 0.11, 0.19, 0.26].forEach((at) => burst({ at, dur: 0.08, filter: 'bandpass', freq: 3000 + Math.random() * 3000, q: 4, gain: 0.12 }))
        tone({ freq: 120, to: 40, at: 0.05, dur: 0.4, gain: 0.35 })
      },
    },
    {
      id: 'buzzer',
      label: '삐빅 버저',
      play: () => {
        tone({ type: 'sawtooth', freq: 220, to: 140, dur: 0.45, gain: 0.15 })
        tone({ type: 'sawtooth', freq: 233, to: 147, dur: 0.45, gain: 0.1 })
      },
    },
  ],
  combo: [
    {
      id: 'whoosh',
      label: '화르륵',
      play: () => {
        burst({ dur: 0.6, filter: 'bandpass', freq: 300, to: 3000, q: 0.8, gain: 0.35 })
        tone({ type: 'sawtooth', freq: 110, to: 220, dur: 0.5, gain: 0.08 })
      },
    },
    {
      id: 'powerup',
      label: '파워 업',
      play: () => {
        ;[523, 659, 784, 1046, 1319].forEach((f, i) => tone({ type: 'square', freq: f, at: i * 0.045, dur: 0.12, gain: 0.08 }))
      },
    },
    {
      id: 'crackle',
      label: '타닥타닥 장작',
      play: () => {
        for (let i = 0; i < 12; i++) {
          burst({ at: i * 0.04 + Math.random() * 0.03, dur: 0.03, filter: 'bandpass', freq: 1500 + Math.random() * 3500, q: 3, gain: 0.2 })
        }
        burst({ dur: 0.6, freq: 800, to: 300, gain: 0.12 })
      },
    },
  ],
  fanfare: [
    {
      id: 'brass',
      label: '빰빠밤',
      play: () => {
        ;[[523, 0, 0.14], [659, 0.15, 0.14], [784, 0.3, 0.14], [1046, 0.45, 0.6]].forEach(([f, at, dur]) => {
          tone({ type: 'sawtooth', freq: f, at, dur, gain: 0.1 })
          tone({ type: 'square', freq: f * 2, at, dur, gain: 0.03 })
        })
      },
    },
    {
      id: 'bells',
      label: '종소리',
      play: () => {
        ;[1046, 1319, 1568, 2093].forEach((f, i) => tone({ freq: f, at: i * 0.12, dur: 0.9, gain: 0.15 }))
      },
    },
    {
      id: 'pops',
      label: '폭죽 팡팡',
      play: () => {
        ;[0, 0.25, 0.45, 0.6].forEach((at) => {
          burst({ at, dur: 0.15, freq: 1200, to: 200, gain: 0.4 })
          burst({ at: at + 0.08, dur: 0.4, filter: 'highpass', freq: 5000, gain: 0.06 })
        })
      },
    },
  ],
  tap: [
    { id: 'tick', label: '톡', play: () => tone({ type: 'triangle', freq: 1800, to: 900, dur: 0.04, gain: 0.08 }) },
    { id: 'pop', label: '뽁', play: () => tone({ freq: 600, to: 1200, dur: 0.06, gain: 0.12 }) },
    { id: 'none', label: '소리 없음', play: () => {} },
  ],
}

export const DEFAULT_PICKS: Record<SoundName, string> = {
  correct: 'chime',
  wrong: 'rumble',
  combo: 'whoosh',
  fanfare: 'brass',
  tap: 'tick',
}

export function playVariant(name: SoundName, id: string) {
  try {
    VARIANTS[name].find((v) => v.id === id)?.play()
  } catch {
    // Audio can be unavailable (e.g. no output device); effects are optional.
  }
}

// Sound effects belong to 게임 모드; 일반 모드 stays quiet.
let gameActive = false
export function setGameAudio(active: boolean) {
  gameActive = active
}

/** Plays the player's chosen variant if a game is running and sound is on. */
export function playSound(name: SoundName) {
  const { sound, soundPicks } = getState().settings
  if (!gameActive || !sound) return
  playVariant(name, soundPicks[name] ?? DEFAULT_PICKS[name])
}
