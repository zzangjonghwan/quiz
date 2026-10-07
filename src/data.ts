import type { Card, CategoryFile, CategoryId, Manifest } from './types'

export type QuestionBank = Map<CategoryId, Card[]>

// Question data ships inside the app (public/data) so it works offline.
// M5 will layer downloaded updates on top of this.
const DATA_BASE = './data/'

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(DATA_BASE + path)
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export async function loadBank(): Promise<QuestionBank> {
  const manifest = await fetchJson<Manifest>('manifest.json')
  const files = await Promise.all(manifest.categories.map((c) => fetchJson<CategoryFile>(c.file)))
  return new Map(files.map((f) => [f.category, f.cards]))
}
