import { Check, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CATEGORY_BY_ID, DIFFICULTY_LABEL } from '../categories'
import { Explanation } from '../components/Explanation'
import { PrimaryButton, Screen, SecondaryButton } from '../components/ui'
import { hapticCorrect, hapticWrong, useBackHandler } from '../native'
import type { AnswerRecord, SessionConfig, SessionItem } from '../session'

export function Quiz({
  config,
  items,
  onQuit,
  onFinish,
}: {
  config: SessionConfig
  items: SessionItem[]
  onQuit: () => void
  onFinish: (answers: AnswerRecord[], durationMs: number) => void
}) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [confirmExit, setConfirmExit] = useState(false)
  const [startedAt] = useState(() => Date.now())
  const explanationRef = useRef<HTMLDivElement>(null)

  const item = items[index]
  const current = answers[index] as AnswerRecord | undefined
  const isLast = index === items.length - 1
  const infinite = config.count === 'infinite'
  const correctCount = answers.filter((a) => a.correct).length

  useBackHandler(() => {
    setConfirmExit(true)
    return true
  })

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [index])

  useEffect(() => {
    // Bring the explanation into view but keep the choices partly visible above it.
    const el = explanationRef.current
    if (!current || !el) return
    const top = el.getBoundingClientRect().top
    if (top > window.innerHeight * 0.55) {
      window.scrollBy({ top: top - window.innerHeight * 0.45, behavior: 'smooth' })
    }
  }, [current])

  const finish = (records: AnswerRecord[]) => onFinish(records, Date.now() - startedAt)

  const choose = (pickedIndex: number) => {
    if (current) return
    const correct = pickedIndex === item.correctIndex
    if (correct) hapticCorrect()
    else hapticWrong()
    setAnswers([...answers, { item, pickedIndex, correct }])
  }

  const next = () => {
    if (isLast) finish(answers)
    else setIndex(index + 1)
  }

  const cat = CATEGORY_BY_ID[item.category]

  return (
    <Screen>
      <header className="sticky top-0 z-10 flex flex-col gap-2 bg-bg px-2 pt-2 pb-3">
        <div className="flex h-10 items-center gap-2">
          <button
            aria-label="그만하기"
            onClick={() => setConfirmExit(true)}
            className="rounded-full p-2 active:bg-surface-2"
          >
            <X size={24} strokeWidth={1.75} />
          </button>
          <span className="flex-1 text-sm font-semibold tabular-nums">
            {infinite ? `${index + 1}번째` : `${index + 1} / ${items.length}`}
          </span>
          <span className="pr-3 text-sm text-fg-muted tabular-nums">
            <span className="text-accent">{correctCount}</span> 정답
          </span>
        </div>
        {!infinite && (
          <div className="mx-3 h-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${((index + (current ? 1 : 0)) / items.length) * 100}%` }}
            />
          </div>
        )}
      </header>

      <main className="flex flex-1 flex-col gap-6 px-5 pt-4 pb-32">
        <div className="flex flex-col gap-3">
          <span className="flex items-center gap-1.5 text-xs font-medium text-fg-muted">
            <cat.icon size={14} strokeWidth={2} />
            {cat.name} · {DIFFICULTY_LABEL[item.card.difficulty]}
          </span>
          <h2 className="text-xl leading-snug font-bold">{item.question.prompt}</h2>
        </div>

        <div className="flex flex-col gap-2.5">
          {item.choices.map((choice, i) => (
            <ChoiceButton
              key={i}
              label={choice}
              number={i + 1}
              state={
                !current
                  ? 'idle'
                  : i === item.correctIndex
                    ? 'correct'
                    : i === current.pickedIndex
                      ? 'wrong'
                      : 'dim'
              }
              onClick={() => choose(i)}
            />
          ))}
        </div>

        {current && (
          <div ref={explanationRef} className="flex flex-col gap-3">
            <p className={`text-lg font-bold ${current.correct ? 'text-accent' : 'text-wrong'}`}>
              {current.correct ? '정답이에요!' : '아쉬워요, 오답이에요'}
            </p>
            <Explanation card={item.card} />
          </div>
        )}
      </main>

      {current && (
        <div
          className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-bg via-bg to-transparent px-5 pt-6"
          style={{ paddingBottom: 'calc(16px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))' }}
        >
          <PrimaryButton onClick={next}>{isLast ? '결과 보기' : '다음 문제'}</PrimaryButton>
        </div>
      )}

      {confirmExit && (
        <ExitDialog
          hasAnswers={answers.length > 0}
          onCancel={() => setConfirmExit(false)}
          onConfirm={() => (answers.length > 0 ? finish(answers) : onQuit())}
        />
      )}
    </Screen>
  )
}

type ChoiceState = 'idle' | 'correct' | 'wrong' | 'dim'

function ChoiceButton({
  label,
  number,
  state,
  onClick,
}: {
  label: string
  number: number
  state: ChoiceState
  onClick: () => void
}) {
  const styles: Record<ChoiceState, string> = {
    idle: 'bg-surface active:bg-surface-2',
    correct: 'bg-accent text-accent-fg',
    wrong: 'bg-wrong/15 text-wrong ring-1 ring-wrong/60',
    dim: 'bg-surface opacity-40',
  }
  return (
    <button
      onClick={onClick}
      disabled={state !== 'idle'}
      className={`flex min-h-14 items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-base font-medium transition-colors ${styles[state]}`}
    >
      <span
        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          state === 'idle' || state === 'dim' ? 'bg-surface-2 text-fg-muted' : ''
        }`}
      >
        {state === 'correct' ? <Check size={18} strokeWidth={3} /> : state === 'wrong' ? <X size={18} strokeWidth={3} /> : number}
      </span>
      <span className="flex-1">{label}</span>
    </button>
  )
}

function ExitDialog({
  hasAnswers,
  onCancel,
  onConfirm,
}: {
  hasAnswers: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  useBackHandler(() => {
    onCancel()
    return true
  })
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative flex w-full max-w-sm flex-col gap-5 rounded-3xl bg-surface p-6">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-lg font-bold">그만할까요?</h2>
          <p className="text-sm text-fg-muted">
            {hasAnswers ? '지금까지 푼 문제로 결과를 보여 드려요.' : '아직 푼 문제가 없어요.'}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <PrimaryButton onClick={onCancel}>계속 풀기</PrimaryButton>
          <SecondaryButton onClick={onConfirm}>{hasAnswers ? '결과 보기' : '나가기'}</SecondaryButton>
        </div>
      </div>
    </div>
  )
}
