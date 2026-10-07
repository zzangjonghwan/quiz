import { BookX, ChartNoAxesColumn, ListChecks, PenLine, Settings } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { QuestionBank } from '../data'
import { useStore } from '../store'
import type { QuizMode } from '../types'

export function Home({
  bank,
  onStart,
  onNote,
  onStats,
  onSettings,
}: {
  bank: QuestionBank
  onStart: (mode: QuizMode) => void
  onNote: () => void
  onStats: () => void
  onSettings: () => void
}) {
  const { progress, stats } = useStore()
  // Due counts are taken when the home screen opens; it re-mounts after every session.
  const [now] = useState(() => Date.now())
  const entries = Object.values(progress)
  const seen = entries.length
  const due = entries.filter((p) => p.due <= now).length
  const inNote = entries.filter((p) => p.inNote).length
  let total = 0
  for (const cards of bank.values()) total += cards.length
  const rate = stats.answers ? `${Math.round((stats.correct / stats.answers) * 100)}%` : '–'

  return (
    <div className="safe-area flex min-h-full flex-col">
      <header className="flex items-center justify-between px-5 pt-6">
        <h1 className="text-[28px] font-extrabold tracking-tight">
          상식<span className="text-accent">한입</span>
        </h1>
        <button aria-label="설정" onClick={onSettings} className="rounded-full p-2 text-fg-muted active:bg-surface-2">
          <Settings size={22} strokeWidth={1.75} />
        </button>
      </header>

      <main className="flex flex-1 flex-col gap-4 px-5 pt-8 pb-6">
        <section className="flex flex-col gap-4 rounded-2xl bg-surface p-5">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="푼 문제" value={seen.toLocaleString()} />
            <Stat label="정답률" value={rate} />
            <Stat label="복습 대기" value={due.toLocaleString()} accent={due > 0} />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${total ? Math.min(100, (seen / total) * 100) : 0}%` }}
              />
            </div>
            <span className="text-xs text-fg-subtle tabular-nums">
              전체 {total.toLocaleString()}문제 중 {seen.toLocaleString()}개 만남
            </span>
          </div>
        </section>

        <ModeButton
          icon={<ListChecks size={26} strokeWidth={1.75} />}
          title="객관식"
          caption="4지선다로 가볍게"
          onClick={() => onStart('mcq')}
          primary
        />
        <ModeButton
          icon={<PenLine size={26} strokeWidth={1.75} />}
          title="주관식"
          caption="직접 써야 오래 남는다"
          onClick={() => onStart('subjective')}
        />

        <div className="grid grid-cols-2 gap-3">
          <SubButton
            icon={<BookX size={20} strokeWidth={1.75} />}
            label="오답노트"
            badge={inNote || undefined}
            onClick={onNote}
          />
          <SubButton icon={<ChartNoAxesColumn size={20} strokeWidth={1.75} />} label="내 기록" onClick={onStats} />
        </div>

        <p className="mt-auto pt-6 text-center text-xs text-fg-subtle">v{__APP_VERSION__}</p>
      </main>
    </div>
  )
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={`text-2xl font-bold tabular-nums ${accent ? 'text-accent' : ''}`}>{value}</span>
      <span className="text-xs text-fg-muted">{label}</span>
    </div>
  )
}

function ModeButton({
  icon,
  title,
  caption,
  onClick,
  primary = false,
}: {
  icon: ReactNode
  title: string
  caption: string
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-4 rounded-2xl p-5 text-left transition-transform active:scale-[0.98] ${
        primary ? 'bg-accent text-accent-fg' : 'bg-surface text-fg'
      }`}
    >
      {icon}
      <span className="flex flex-col">
        <span className="text-lg font-bold">{title}</span>
        <span className={`text-sm ${primary ? 'opacity-70' : 'text-fg-muted'}`}>{caption}</span>
      </span>
    </button>
  )
}

function SubButton({
  icon,
  label,
  badge,
  onClick,
}: {
  icon: ReactNode
  label: string
  badge?: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-2xl bg-surface p-4 text-sm font-medium active:bg-surface-2"
    >
      <span className="text-fg-muted">{icon}</span>
      {label}
      {badge !== undefined && (
        <span className="ml-auto rounded-full bg-wrong/15 px-2 py-0.5 text-xs font-semibold text-wrong tabular-nums">
          {badge}
        </span>
      )}
    </button>
  )
}
