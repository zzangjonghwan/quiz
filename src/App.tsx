import { BookX, ChartNoAxesColumn, ListChecks, PenLine, Settings } from 'lucide-react'
import type { ReactNode } from 'react'

// M0 placeholder home screen: real navigation and game logic arrive in M1.
export default function App() {
  return (
    <div className="safe-area flex min-h-full flex-col">
      <header className="flex items-center justify-between px-5 pt-6">
        <h1 className="text-[28px] font-extrabold tracking-tight">
          상식<span className="text-accent">한입</span>
        </h1>
        <button aria-label="설정" className="rounded-full p-2 text-fg-muted active:bg-surface-2">
          <Settings size={22} strokeWidth={1.75} />
        </button>
      </header>

      <main className="flex flex-1 flex-col gap-4 px-5 pt-8 pb-6">
        <section className="grid grid-cols-3 gap-3 rounded-2xl bg-surface p-5">
          <Stat label="푼 문제" value="0" />
          <Stat label="정답률" value="–" />
          <Stat label="복습 대기" value="0" />
        </section>

        <ModeButton
          icon={<ListChecks size={26} strokeWidth={1.75} />}
          title="객관식"
          caption="4지선다로 가볍게"
          primary
        />
        <ModeButton
          icon={<PenLine size={26} strokeWidth={1.75} />}
          title="주관식"
          caption="직접 써야 오래 남는다"
        />

        <div className="grid grid-cols-2 gap-3">
          <SubButton icon={<BookX size={20} strokeWidth={1.75} />} label="오답노트" />
          <SubButton icon={<ChartNoAxesColumn size={20} strokeWidth={1.75} />} label="내 기록" />
        </div>

        <p className="mt-auto pt-6 text-center text-xs text-fg-subtle">
          v{__APP_VERSION__} · 준비 중인 화면입니다
        </p>
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-xs text-fg-muted">{label}</span>
    </div>
  )
}

function ModeButton({
  icon,
  title,
  caption,
  primary = false,
}: {
  icon: ReactNode
  title: string
  caption: string
  primary?: boolean
}) {
  return (
    <button
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

function SubButton({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button className="flex items-center gap-2 rounded-2xl bg-surface p-4 text-sm font-medium active:bg-surface-2">
      <span className="text-fg-muted">{icon}</span>
      {label}
    </button>
  )
}
