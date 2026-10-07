// Publishes the story MP3s listed in public/data/stories.json to the repo's `stories` branch,
// which the app downloads from (raw.githubusercontent.com). Run after `node scripts/stories.mjs`.
// The branch holds only audio/. Files no longer referenced stay, because installed older app
// versions carry their own stories.json and still point at them.
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const WORK = join(ROOT, '.stories', 'publish')
const git = (args, cwd = ROOT) => execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim()

const { stories } = JSON.parse(readFileSync(join(ROOT, 'public', 'data', 'stories.json'), 'utf8'))
const wanted = new Set(stories.flatMap((s) => Object.values(s.voices).map((v) => v.file)))

if (!existsSync(WORK)) {
  const remote = git(['ls-remote', '--heads', 'origin', 'stories'])
  if (remote) {
    git(['fetch', 'origin', 'stories:stories'])
    git(['worktree', 'add', WORK, 'stories'])
  } else {
    git(['worktree', 'add', '--detach', WORK])
    git(['checkout', '--orphan', 'stories'], WORK)
    git(['rm', '-rf', '--quiet', '.'], WORK)
  }
}

const audioDir = join(WORK, 'audio')
mkdirSync(audioDir, { recursive: true })
for (const f of wanted) {
  const src = join(ROOT, '.stories', 'audio', f)
  if (!existsSync(src)) throw new Error(`${f} 파일이 없어요. 먼저 node scripts/stories.mjs를 실행하세요`)
  copyFileSync(src, join(audioDir, f))
}

git(['add', '-A', 'audio'], WORK)
if (git(['status', '--porcelain'], WORK)) {
  git(['commit', '-q', '-m', `이야기 음성 파일 ${wanted.size}개`], WORK)
  git(['push', '-q', 'origin', 'stories'], WORK)
  console.log(`✓ stories 브랜치에 음성 파일 ${wanted.size}개`)
} else {
  console.log('바뀐 음성 없음')
}
