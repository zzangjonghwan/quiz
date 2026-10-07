import { Headphones, ListChecks, Pause, Play } from 'lucide-react'
import { toggle, usePlayer } from '../player'

export type Tab = 'quiz' | 'plus'

/** Bottom navigation for the two top-level tabs, with a mini player while a story is loaded. */
export function TabBar({ tab, onTab, onOpenStory }: { tab: Tab; onTab: (t: Tab) => void; onOpenStory: () => void }) {
  const { story, playing, position, duration, buffering } = usePlayer()
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 backdrop-blur"
      style={{ paddingBottom: 'var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))' }}
    >
      {story && (
        <div className="flex items-center gap-3 border-b border-line px-4 py-2">
          <button onClick={onOpenStory} className="flex min-w-0 flex-1 flex-col text-left">
            <span className="truncate text-sm font-semibold">{story.title}</span>
            <span className="h-1 overflow-hidden rounded-full bg-surface-2">
              <span
                className="block h-full rounded-full bg-accent"
                style={{ width: `${duration ? (position / duration) * 100 : 0}%` }}
              />
            </span>
          </button>
          <button
            aria-label={playing ? '일시 정지' : '재생'}
            onClick={toggle}
            className={`flex size-10 items-center justify-center rounded-full bg-accent text-accent-fg ${buffering ? 'animate-pulse' : ''}`}
          >
            {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
          </button>
        </div>
      )}
      <nav className="grid grid-cols-2">
        <TabButton active={tab === 'quiz'} onClick={() => onTab('quiz')} icon={<ListChecks size={22} strokeWidth={1.75} />} label="퀴즈" />
        <TabButton active={tab === 'plus'} onClick={() => onTab('plus')} icon={<Headphones size={22} strokeWidth={1.75} />} label="상식플러스" />
      </nav>
    </div>
  )
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${active ? 'text-accent' : 'text-fg-subtle'}`}
    >
      {icon}
      {label}
    </button>
  )
}
