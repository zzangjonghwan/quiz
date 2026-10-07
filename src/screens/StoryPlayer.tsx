import { Pause, Play, RotateCcw, RotateCw, SkipForward } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Header } from '../components/ui'
import { useBackHandler } from '../native'
import { playStory, seek, setRate, skip, toggle, usePlayer } from '../player'
import { formatTime, STORY_CATEGORIES, type Story } from '../stories'

const RATES = [1, 1.1, 1.25, 1.5]

/** Full player: the story text with the paragraph being read highlighted, and playback controls. */
export function StoryPlayer({ story: opened, next, onBack, onNext }: { story: Story; next?: Story; onBack: () => void; onNext: (s: Story) => void }) {
  const player = usePlayer()
  const current = player.story?.id === opened.id
  // The recording actually loaded (its timings), which can be another voice than the one opened.
  const story = current ? player.story! : opened
  const position = current ? player.position : 0
  const duration = current && player.duration ? player.duration : story.duration
  const reading = current ? currentParagraph(story, position) : -1
  const refs = useRef<(HTMLParagraphElement | null)[]>([])

  useBackHandler(() => {
    onBack()
    return true
  })

  // Start playing as soon as the story opens (unless it is already the one playing).
  useEffect(() => {
    if (player.story?.id !== story.id) void playStory(story)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story.id])

  useEffect(() => {
    const el = refs.current[reading]
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.top < 80 || r.bottom > window.innerHeight - 220) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [reading])

  const cat = STORY_CATEGORIES.find((c) => c.id === story.cat)!
  const nextRate = RATES[(RATES.indexOf(player.rate) + 1) % RATES.length] ?? 1

  return (
    <div className="safe-area flex min-h-full flex-col">
      <Header title={cat.name} onBack={onBack} />
      <main className="flex flex-col gap-5 px-6 pt-2 pb-64">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl leading-snug font-extrabold">{story.title}</h2>
          <p className="text-sm text-fg-muted">{story.sub}</p>
        </div>
        <div className="flex flex-col gap-4">
          {story.paragraphs.map((p, i) => (
            <p
              key={i}
              ref={(el) => {
                refs.current[i] = el
              }}
              onClick={() => (current ? seek(story.starts[i]) : void playStory(story, story.starts[i]))}
              data-tap
              className={`text-[17px] leading-relaxed transition-colors duration-300 ${
                i === reading ? 'font-medium text-fg' : reading >= 0 ? 'text-fg-subtle' : 'text-fg-muted'
              }`}
            >
              {p}
            </p>
          ))}
        </div>
        {next && (
          <button onClick={() => onNext(next)} className="flex items-center gap-3 rounded-2xl bg-surface p-4 text-left">
            <SkipForward size={20} className="text-accent" />
            <span className="flex flex-col">
              <span className="text-xs text-fg-subtle">다음 이야기</span>
              <span className="text-[15px] font-bold">{next.title}</span>
            </span>
          </button>
        )}
      </main>

      <div
        className="fixed inset-x-0 bottom-0 z-10 flex flex-col gap-3 border-t border-line bg-bg/95 px-6 pt-4 backdrop-blur"
        style={{ paddingBottom: 'calc(16px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))' }}
      >
        {current && player.error && <p className="text-center text-sm text-wrong">{player.error}</p>}
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.5}
          value={position}
          onChange={(e) => (current ? seek(Number(e.target.value)) : void playStory(story, Number(e.target.value)))}
          aria-label="재생 위치"
          className="w-full accent-[var(--color-accent)]"
        />
        <div className="-mt-2 flex justify-between text-xs text-fg-subtle tabular-nums">
          <span>{formatTime(position)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setRate(nextRate)}
            className="w-14 rounded-full bg-surface-2 py-1.5 text-sm font-bold tabular-nums"
            aria-label="재생 속도"
          >
            {player.rate}x
          </button>
          <button aria-label="15초 뒤로" onClick={() => skip(-15)} disabled={!current} className="p-2 disabled:opacity-30">
            <RotateCcw size={28} strokeWidth={1.75} />
          </button>
          <button
            aria-label={current && player.playing ? '일시 정지' : '재생'}
            onClick={() => (current ? toggle() : void playStory(story))}
            className={`flex size-16 items-center justify-center rounded-full bg-accent text-accent-fg ${
              current && player.buffering ? 'animate-pulse' : ''
            }`}
          >
            {current && player.playing ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
          </button>
          <button aria-label="15초 앞으로" onClick={() => skip(15)} disabled={!current} className="p-2 disabled:opacity-30">
            <RotateCw size={28} strokeWidth={1.75} />
          </button>
          <span className="w-14" />
        </div>
      </div>
    </div>
  )
}

function currentParagraph(story: Story, position: number) {
  let i = 0
  while (i + 1 < story.starts.length && story.starts[i + 1] <= position + 0.2) i++
  return i
}
