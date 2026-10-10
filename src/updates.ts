// 문제 업데이트: question fixes and additions reach installed apps without a new APK. The app ships
// with public/data; on start it checks the web version's copy (GitHub Pages, rebuilt on every push
// to main) and keeps the files that changed in app storage, the same way 학습 팩 are kept.
// The web version always serves the latest data itself, so this only runs in the Android app.
import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import type { CategoryFile, Manifest } from './types'

/** The data format this app reads (scripts/data.mjs writes it and bumps it on breaking changes). */
const SCHEMA = 1
const REMOTE = 'https://zzangjonghwan.github.io/quiz/data/'
const SHIPPED = './data/'
/** The manifest of the last update kept in storage. */
const KEPT_MANIFEST = 'data/manifest.json'
/** file → hash of each updated file in storage. */
const KEPT_FILES = 'data/files.json'

const enabled = Capacitor.isNativePlatform()

async function fetchText(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  return res.text()
}

async function readKept(path: string) {
  const { data } = await Filesystem.readFile({ path, directory: Directory.Data, encoding: Encoding.UTF8 })
  return data as string
}

function writeKept(path: string, data: string) {
  return Filesystem.writeFile({ path, data, directory: Directory.Data, encoding: Encoding.UTF8, recursive: true })
}

/** Same as hashOf() in scripts/data.mjs. */
async function hashOf(text: string) {
  const bytes = new TextEncoder().encode(text.replace(/\r\n/g, '\n'))
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', bytes))
  return Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 12)
}

async function shippedManifest() {
  return JSON.parse(await fetchText(SHIPPED + 'manifest.json')) as Manifest
}

/** The newer of the shipped data and the last update in storage (an app update brings its own). */
async function currentManifest(shipped: Manifest) {
  if (!enabled) return shipped
  try {
    const kept = JSON.parse(await readKept(KEPT_MANIFEST)) as Manifest
    return kept.schema <= SCHEMA && kept.built > shipped.built ? kept : shipped
  } catch {
    return shipped
  }
}

/** Every question file of the current data, each read from the app itself or from storage. */
export async function loadDataFiles(): Promise<CategoryFile[]> {
  const shipped = await shippedManifest()
  const manifest = await currentManifest(shipped)
  const inApp = new Map(shipped.files.map((f) => [f.file, f.hash]))
  const read = (m: Manifest) =>
    Promise.all(
      m.files.map(async (f) =>
        JSON.parse(inApp.get(f.file) === f.hash ? await fetchText(SHIPPED + f.file) : await readKept(`data/${f.file}`)),
      ),
    ) as Promise<CategoryFile[]>
  if (manifest === shipped) return read(shipped)
  try {
    return await read(manifest)
  } catch (e) {
    console.error('updated questions unreadable, using the shipped ones', e)
    return read(shipped)
  }
}

/**
 * Downloads newer question data if the web version has any. Resolves true once it is stored, so
 * the next loadDataFiles() picks it up. Files are checked against their hash before they count.
 */
export async function updateData(): Promise<boolean> {
  if (!enabled) return false
  const shipped = await shippedManifest()
  const current = await currentManifest(shipped)
  const remote = JSON.parse(await fetchText(`${REMOTE}manifest.json?t=${Date.now()}`)) as Manifest
  if (remote.schema > SCHEMA || remote.id === current.id || remote.built <= current.built) return false

  const inApp = new Map(shipped.files.map((f) => [f.file, f.hash]))
  let kept: Record<string, string> = {}
  try {
    kept = JSON.parse(await readKept(KEPT_FILES))
  } catch {
    // Nothing downloaded yet.
  }
  for (const f of remote.files) {
    if (inApp.get(f.file) === f.hash || kept[f.file] === f.hash) continue
    const text = await fetchText(`${REMOTE}${f.file}?h=${f.hash}`)
    if ((await hashOf(text)) !== f.hash) throw new Error(`${f.file}: 받은 내용이 목록과 달라요`)
    await writeKept(`data/${f.file}`, text)
    kept[f.file] = f.hash
    await writeKept(KEPT_FILES, JSON.stringify(kept))
  }
  // The manifest goes last: until it is written, the app keeps reading the data it had.
  await writeKept(KEPT_MANIFEST, JSON.stringify(remote))

  const needed = new Set(remote.files.filter((f) => inApp.get(f.file) !== f.hash).map((f) => f.file))
  for (const file of Object.keys(kept)) {
    if (needed.has(file)) continue
    await Filesystem.deleteFile({ path: `data/${file}`, directory: Directory.Data }).catch(() => {})
    delete kept[file]
  }
  await writeKept(KEPT_FILES, JSON.stringify(kept))
  return true
}
