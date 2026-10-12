import { Check, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useBackHandler } from '../native'
import { usePlayer } from '../player'
import { formatTime, loadStories, STORY_CATEGORIES, type Story, type StoryCategory } from '../stories'
import { useStore } from '../store'

/** 상식플러스 tab: the list of audio stories by category. */
export function Plus({ onOpen, onBack }: { onOpen: (story: Story) => void; onBack: () => void }) {
  const [stories, setStories] = useState<Story[] | null>(null)
  const [cat, setCat] = useState<StoryCategory | 'all'>('all')
  const { listening } = useStore()
  const { story: current, playing } = usePlayer()

  useBackHandler(() => {
    onBack()
    return true
  })

  useEffect(() => {
    void loadStories().then(setStories, () => setStories([]))
  }, [])

  const shown = (stories ?? []).filter((s) => cat === 'all' || s.cat === cat)
  const done = (stories ?? []).filter((s) => listening[s.id]?.done).length

  return (
    <div className="safe-area flex min-h-full flex-col">
      <header className="flex flex-col gap-1 px-5 pt-6">
        <h1 className="text-[28px] font-extrabold tracking-tight">
          상식<span className="text-accent">플러스</span>
        </h1>
        <p className="text-sm text-fg-muted">
          귀로 듣는 3분 교양 이야기{stories ? ` · ${stories.length}편 중 ${done}편 들음` : ''}
        </p>
      </header>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pt-5 pb-1">
        <Chip active={cat === 'all'} onClick={() => setCat('all')} label="전체" />
        {STORY_CATEGORIES.map((c) => (
          <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)} label={c.name} />
        ))}
      </div>

      <main className="flex flex-col gap-2.5 px-5 pt-3 pb-44">
        {stories === null && <p className="py-10 text-center text-sm text-fg-muted">불러오는 중…</p>}
        {shown.map((s) => {
          const c = STORY_CATEGORIES.find((x) => x.id === s.cat)!
          const saved = listening[s.id]
          const isCurrent = current?.id === s.id
          return (
            <button
              key={s.id}
              onClick={() => onOpen(s)}
              className={`flex items-center gap-4 rounded-2xl p-4 text-left active:scale-[0.99] ${
                isCurrent ? 'bg-accent/10 ring-1 ring-accent/50' : 'bg-surface'
              }`}
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-accent">
                <c.icon size={22} strokeWidth={1.75} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-xs text-fg-subtle">{c.name}</span>
                <span className="truncate text-[15px] font-bold">{s.title}</span>
                <span className="truncate text-xs text-fg-muted">{s.sub}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1 text-xs tabular-nums">
                {isCurrent && playing ? (
                  <span className="font-semibold text-accent">재생 중</span>
                ) : saved?.done ? (
                  <span className="flex items-center gap-0.5 text-accent">
                    <Check size={14} strokeWidth={3} />
                    들음
                  </span>
                ) : saved && saved.position > 5 ? (
                  <span className="text-fg-muted">{formatTime(saved.position)}부터</span>
                ) : null}
                <span className="flex items-center gap-1 text-fg-subtle">
                  <Clock size={12} />
                  {formatTime(s.duration)}
                </span>
              </span>
            </button>
          )
        })}
      </main>
    </div>
  )
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
        active ? 'bg-fg text-bg' : 'bg-surface text-fg-muted'
      }`}
    >
      {label}
    </button>
  )
}
