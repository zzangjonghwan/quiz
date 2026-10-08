// 상식플러스: short audio stories. Text and timings ship in public/data/stories.json; the MP3s live
// on the repo's `stories` branch and are downloaded on first play, then kept for offline listening.
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { BookOpen, Brain, Landmark, Palette, ScrollText, Sparkles, type LucideIcon } from 'lucide-react'

export type StoryCategory = 'samguk' | 'myth' | 'tarot' | 'art' | 'history' | 'wisdom'

export type VoiceId = 'moa' | 'arin' | 'doyoung'

/** The narrators to pick from in 설정 (Gemini and Fish Audio voices; previews ship in public/voices). */
export const VOICES: { id: VoiceId; name: string; desc: string }[] = [
  { id: 'moa', name: '모아', desc: '명랑하고 생기 있는 목소리' },
  { id: 'arin', name: '아린', desc: '밝고 부드러운 목소리' },
  { id: 'doyoung', name: '도영', desc: '차분하고 또렷한 목소리' },
]

/** One recording of a story. */
export interface Take {
  file: string
  duration: number
  /** Paragraph start times in seconds. */
  starts: number[]
}

interface StoryData {
  id: string
  cat: StoryCategory
  title: string
  sub: string
  paragraphs: string[]
  voices: Partial<Record<VoiceId, Take>>
}

/** A story as heard in one voice. */
export interface Story extends StoryData, Take {
  voice: VoiceId
}

export const STORY_CATEGORIES: { id: StoryCategory; name: string; icon: LucideIcon }[] = [
  { id: 'samguk', name: '삼국지', icon: ScrollText },
  { id: 'myth', name: '신화', icon: Sparkles },
  { id: 'tarot', name: '타로', icon: BookOpen },
  { id: 'art', name: '예술', icon: Palette },
  { id: 'history', name: '역사', icon: Landmark },
  { id: 'wisdom', name: '평생 교양', icon: Brain },
]

// In development the generated files are served straight from .stories/ (see scripts/stories.mjs).
const AUDIO_BASE = import.meta.env.DEV
  ? '/.stories/audio/'
  : 'https://raw.githubusercontent.com/zzangjonghwan/quiz/stories/audio/'

let cache: Promise<StoryData[]> | null = null

/** The stories in the chosen voice (모아, then 아린, wherever that one isn't recorded). */
export function loadStories(voice: VoiceId) {
  cache ??= fetch(`${import.meta.env.BASE_URL}data/stories.json`)
    .then((r) => r.json() as Promise<{ stories: StoryData[] }>)
    .then((d) => d.stories)
  return cache.then((list) => list.map((s) => inVoice(s, voice)))
}

/** Voices with at least one recorded story; the others stay hidden in 설정. */
export async function recordedVoices() {
  await loadStories('arin')
  const list = await cache!
  return new Set(list.flatMap((s) => Object.keys(s.voices) as VoiceId[]))
}

export function inVoice(story: StoryData, voice: VoiceId): Story {
  const v = ([voice, 'moa', 'arin'] as VoiceId[]).find((id) => story.voices[id]) ?? (Object.keys(story.voices)[0] as VoiceId)
  return { ...story, ...story.voices[v]!, voice: v }
}

/** Carries a listening position over to another recording, paragraph by paragraph. */
export function convertPosition(story: Story, from: VoiceId, position: number) {
  const old = story.voices[from]
  if (from === story.voice || !old) return position
  let i = 0
  while (i + 1 < old.starts.length && old.starts[i + 1] <= position) i++
  const end = old.starts[i + 1] ?? old.duration
  const nextStart = story.starts[i + 1] ?? story.duration
  const t = Math.min(1, (position - old.starts[i]) / Math.max(1, end - old.starts[i]))
  return story.starts[i] + t * (nextStart - story.starts[i])
}

export const voiceName = (id: VoiceId) => VOICES.find((v) => v.id === id)?.name ?? id

export const remoteUrl = (story: Story) => AUDIO_BASE + story.file

const localPath = (story: Story) => `stories/${story.file}`

/** The URL to play: the downloaded copy if there is one, otherwise the remote file. */
export async function playableUrl(story: Story) {
  if (!Capacitor.isNativePlatform()) return remoteUrl(story)
  try {
    await Filesystem.stat({ path: localPath(story), directory: Directory.Data })
    const { uri } = await Filesystem.getUri({ path: localPath(story), directory: Directory.Data })
    return uri
  } catch {
    return remoteUrl(story)
  }
}

/** Saves the story's audio for offline listening. Failures are ignored; it streams next time. */
export async function download(story: Story) {
  if (!Capacitor.isNativePlatform()) return false
  try {
    await Filesystem.downloadFile({
      url: remoteUrl(story),
      path: localPath(story),
      directory: Directory.Data,
      recursive: true,
    })
    return true
  } catch {
    return false
  }
}

export async function isDownloaded(story: Story) {
  if (!Capacitor.isNativePlatform()) return false
  try {
    await Filesystem.stat({ path: localPath(story), directory: Directory.Data })
    return true
  } catch {
    return false
  }
}

export function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
