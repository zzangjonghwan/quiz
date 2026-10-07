// 상식플러스: short audio stories. Text and timings ship in public/data/stories.json; the MP3s live
// on the repo's `stories` branch and are downloaded on first play, then kept for offline listening.
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { BookOpen, Brain, Landmark, Palette, ScrollText, Sparkles, type LucideIcon } from 'lucide-react'

export type StoryCategory = 'samguk' | 'myth' | 'tarot' | 'art' | 'history' | 'wisdom'

export interface Story {
  id: string
  cat: StoryCategory
  title: string
  sub: string
  paragraphs: string[]
  /** Paragraph start times in seconds. */
  starts: number[]
  duration: number
  file: string
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

let cache: Promise<Story[]> | null = null

export function loadStories() {
  cache ??= fetch(`${import.meta.env.BASE_URL}data/stories.json`)
    .then((r) => r.json() as Promise<{ stories: Story[] }>)
    .then((d) => d.stories)
  return cache
}

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
