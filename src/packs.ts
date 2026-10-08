// 학습 팩: optional question sets (e.g. 일본어 한자) that only people who want them download from
// 설정. They're published in the repo's packs/ folder on main and kept in app storage afterwards,
// so they work offline and can be updated without a new APK.
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { getState, updateSettings } from './store'
import type { CategoryFile, CategoryId } from './types'

/** One entry of packs/index.json (written by scripts/build-packs.mjs). */
export interface PackInfo {
  id: string
  category: CategoryId
  name: string
  desc: string
  version: number
  cards: number
  bytes: number
}

// In development the generated files are served straight from the repo by Vite.
const BASE = import.meta.env.DEV
  ? '/packs/'
  : 'https://raw.githubusercontent.com/zzangjonghwan/quiz/main/packs/'

const localPath = (id: string) => `packs/${id}.json`

export async function fetchPackIndex(): Promise<PackInfo[]> {
  const res = await fetch(`${BASE}index.json?t=${Date.now()}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return ((await res.json()) as { packs: PackInfo[] }).packs
}

/** Downloads (or updates) a pack. A newly added pack stays out of 종합 until turned on there. */
export async function installPack(info: PackInfo) {
  const res = await fetch(`${BASE}${info.id}.json?v=${info.version}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  const file = JSON.parse(text) as CategoryFile
  if (file.category !== info.category || !Array.isArray(file.cards)) throw new Error('팩 파일이 올바르지 않아요')
  await Filesystem.writeFile({
    path: localPath(info.id),
    data: text,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
    recursive: true,
  })
  const { packs, excluded } = getState().settings
  const isNew = !packs.some((p) => p.id === info.id)
  updateSettings({
    packs: [...packs.filter((p) => p.id !== info.id), { id: info.id, category: info.category, version: info.version }],
    excluded: isNew && !excluded.includes(info.category) ? [...excluded, info.category] : excluded,
  })
}

/** Removes a pack's questions. Learning progress is kept, so downloading it again picks up where it was. */
export async function removePack(id: string) {
  const { packs, excluded } = getState().settings
  const pack = packs.find((p) => p.id === id)
  await Filesystem.deleteFile({ path: localPath(id), directory: Directory.Data }).catch(() => {})
  updateSettings({
    packs: packs.filter((p) => p.id !== id),
    excluded: pack ? excluded.filter((c) => c !== pack.category) : excluded,
  })
}

export async function loadInstalledPacks(): Promise<CategoryFile[]> {
  const files: CategoryFile[] = []
  for (const p of getState().settings.packs) {
    try {
      const { data } = await Filesystem.readFile({ path: localPath(p.id), directory: Directory.Data, encoding: Encoding.UTF8 })
      files.push(JSON.parse(data as string) as CategoryFile)
    } catch (e) {
      console.error('pack load failed', p.id, e)
    }
  }
  return files
}
