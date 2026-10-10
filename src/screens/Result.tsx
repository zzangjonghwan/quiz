import { Check, ChevronDown, Flame, Trophy, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CATEGORY_BY_ID, DIFFICULTY_LABEL } from '../categories'
import { CardImage } from '../components/CardImage'
import { Explanation } from '../components/Explanation'
import { PrimaryButton, Screen, SecondaryButton } from '../components/ui'
import { celebrate, clearFx } from '../fx'
import type { GameResult } from '../game'
import { useBackHandler } from '../native'
import { playSound, setGameAudio } from '../sound'
import { getState, recordGame } from '../store'
import { correctAnswerText, type AnswerRecord, type SessionConfig } from '../session'

export function Result({
  config,
  answers,
  durationMs,
  game,
  onRetry,
  onHome,
}: {
  config: SessionConfig
  answers: AnswerRecord[]
  durationMs: number
  game?: GameResult
  onRetry: () => void
  onHome: () => void
}) {
  const [open, setOpen] = useState<number | null>(null)
  useBackHandler(() => {
    onHome()
    return true
  })

  const correct = answers.filter((a) => a.correct).length
  const rate = answers.length ? Math.round((correct / answers.length) * 100) : 0

  // 게임 모드: save the record once, then celebrate a good run.
  const [newBest, setNewBest] = useState(false)
  const [bestScore] = useState(() => getState().stats.bestScore)
  const recorded = useRef(false)
  useEffect(() => {
    if (!game || recorded.current) return
    recorded.current = true
    const best = recordGame(game.score, game.maxCombo)
    setNewBest(best && game.score > 0)
    setGameAudio(true)
    if ((best && game.score > 0) || rate >= 70) {
      playSound('fanfare')
      celebrate(best ? 6 : 3)
    }
    return () => {
      setGameAudio(false)
      clearFx()
    }
  }, [game, rate])
  const title =
    (config.source === 'note' ? '오답노트 · ' : '') +
    (config.category ? CATEGORY_BY_ID[config.category].name : '종합') +
    (config.mode === 'subjective' ? ' · 주관식' : '')
  const difficulty = config.difficulty === 'mixed' ? '섞기' : DIFFICULTY_LABEL[config.difficulty]

  return (
    <Screen>
      <main className="flex flex-1 flex-col gap-6 px-5 pt-10 pb-8">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-fg-muted">
            {title} · {difficulty}
          </span>
          <p className="text-5xl font-extrabold tabular-nums">
            <span className="text-accent">{correct}</span>
            <span className="text-fg-subtle"> / {answers.length}</span>
          </p>
          <p className="pt-1 text-sm text-fg-muted">{comment(rate)}</p>
        </div>

        {game && (
          <section className="relative flex flex-col gap-3 overflow-hidden rounded-2xl bg-surface p-5">
            {newBest && (
              <span className="fx-pulse absolute top-4 right-4 flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-extrabold text-accent-fg">
                <Trophy size={13} strokeWidth={2.5} />
                최고 기록!
              </span>
            )}
            <span className="text-xs font-semibold text-fg-subtle">게임 점수</span>
            <span className="text-4xl font-black text-accent tabular-nums">{game.score.toLocaleString()}</span>
            <div className="flex gap-4 text-sm text-fg-muted">
              <span className="flex items-center gap-1">
                <Flame size={15} className="text-orange-400" />
                최대 {game.maxCombo}콤보
              </span>
              <span>최고 기록 {Math.max(bestScore, game.score).toLocaleString()}</span>
            </div>
          </section>
        )}

        <section className="grid grid-cols-2 gap-3 rounded-2xl bg-surface p-5">
          <Stat label="정답률" value={`${rate}%`} />
          <Stat label="걸린 시간" value={formatDuration(durationMs)} />
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="px-1 text-xs font-semibold text-fg-subtle">푼 문제</h2>
          {answers.map((a, i) => (
            <div key={i} className="overflow-hidden rounded-2xl bg-surface">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center gap-3 p-4 text-left active:bg-surface-2"
              >
                {a.correct ? (
                  <Check size={18} strokeWidth={3} className="shrink-0 text-accent" />
                ) : (
                  <X size={18} strokeWidth={3} className="shrink-0 text-wrong" />
                )}
                <span className="flex-1 text-[15px] leading-snug">
                  {a.item.prompt}
                  <span className="mt-1 block text-sm text-fg-muted">
                    정답: {correctAnswerText(a.item)}
                    {a.typed && !a.correct && <span className="text-wrong"> · 내 답: {a.typed}</span>}
                  </span>
                </span>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-fg-subtle transition-transform ${open === i ? 'rotate-180' : ''}`}
                />
              </button>
              {open === i && (
                <div className="flex flex-col gap-2 px-2 pb-2">
                  {a.item.card.image && <CardImage image={a.item.card.image} size="small" />}
                  <Explanation card={a.item.card} item={a.item} />
                </div>
              )}
            </div>
          ))}
        </section>

        <div className="mt-auto flex flex-col gap-2 pt-4">
          <PrimaryButton onClick={onRetry}>같은 설정으로 다시</PrimaryButton>
          <SecondaryButton onClick={onHome}>홈으로</SecondaryButton>
        </div>
      </main>
    </Screen>
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

function comment(rate: number) {
  if (rate === 100) return '완벽해요. 이 분야는 이미 고수네요.'
  if (rate >= 80) return '훌륭해요. 틀린 문제만 다시 보면 끝.'
  if (rate >= 50) return '절반은 넘었어요. 해설을 한 번 더 읽어 보세요.'
  return '오늘 새로 알게 된 게 많네요. 그게 이 앱의 목적이에요.'
}

function formatDuration(ms: number) {
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  return m ? `${m}분 ${s % 60}초` : `${s}초`
}
