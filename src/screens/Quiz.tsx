import { Check, Lightbulb, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { hintText, judge, type Verdict } from '../answer'
import { CATEGORY_BY_ID, DIFFICULTY_LABEL } from '../categories'
import { CardImage } from '../components/CardImage'
import { Explanation } from '../components/Explanation'
import { PrimaryButton, Screen, SecondaryButton } from '../components/ui'
import { hapticCorrect, hapticWrong, useBackHandler } from '../native'
import type { AnswerRecord, McqItem, SessionConfig, SessionItem, SubjectiveItem } from '../session'
import { recordAnswer, replaceAnswer, type AnswerSnapshot } from '../store'

export function Quiz({
  config,
  items,
  onQuit,
  onFinish,
}: {
  config: SessionConfig
  items: SessionItem[]
  onQuit: () => void
  onFinish: (answers: AnswerRecord[]) => void
}) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [confirmExit, setConfirmExit] = useState(false)
  const snapshot = useRef<AnswerSnapshot | null>(null)
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
    // Bring the explanation into view but keep the question partly visible above it.
    const el = explanationRef.current
    if (!current || !el) return
    const top = el.getBoundingClientRect().top
    if (top > window.innerHeight * 0.55) {
      window.scrollBy({ top: top - window.innerHeight * 0.45, behavior: 'smooth' })
    }
  }, [current])

  const answer = (record: Omit<AnswerRecord, 'item'>) => {
    if (record.correct) hapticCorrect()
    else hapticWrong()
    snapshot.current = recordAnswer(item.card.id, record.correct, record.hinted)
    setAnswers([...answers, { item, ...record }])
  }

  // 주관식 "맞은 걸로 할게요": re-grade the last answer as correct.
  const overrideCorrect = () => {
    if (!current || current.correct || !snapshot.current) return
    hapticCorrect()
    snapshot.current = replaceAnswer(snapshot.current, true, current.hinted)
    setAnswers(answers.map((a, i) => (i === index ? { ...a, correct: true } : a)))
  }

  const next = () => {
    if (isLast) onFinish(answers)
    else setIndex(index + 1)
  }

  const cat = CATEGORY_BY_ID[item.category]

  return (
    <Screen>
      <header className="sticky top-0 z-10 flex flex-col gap-2 bg-bg px-2 pt-2 pb-3">
        <div className="flex h-10 items-center gap-2">
          <button aria-label="그만하기" onClick={() => setConfirmExit(true)} className="rounded-full p-2 active:bg-surface-2">
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
            {config.source === 'note' && ' · 오답노트'}
          </span>
          <h2 className="text-xl leading-snug font-bold">{item.prompt}</h2>
        </div>

        {item.card.image && <CardImage image={item.card.image} />}

        {item.kind === 'mcq' ? (
          <McqChoices item={item} current={current} onAnswer={(pickedIndex) =>
            answer({ correct: pickedIndex === item.correctIndex, pickedIndex })
          } />
        ) : (
          <SubjectiveInput key={index} item={item} current={current} onAnswer={answer} onOverride={overrideCorrect} />
        )}

        {current && (
          <div ref={explanationRef} className="flex flex-col gap-3">
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
          onConfirm={() => (answers.length > 0 ? onFinish(answers) : onQuit())}
        />
      )}
    </Screen>
  )
}

function McqChoices({
  item,
  current,
  onAnswer,
}: {
  item: McqItem
  current: AnswerRecord | undefined
  onAnswer: (pickedIndex: number) => void
}) {
  return (
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
          onClick={() => !current && onAnswer(i)}
        />
      ))}
      {current && <Verdict correct={current.correct} />}
    </div>
  )
}

function SubjectiveInput({
  item,
  current,
  onAnswer,
  onOverride,
}: {
  item: SubjectiveItem
  current: AnswerRecord | undefined
  onAnswer: (record: Omit<AnswerRecord, 'item'>) => void
  onOverride: () => void
}) {
  const [typed, setTyped] = useState('')
  const [hint, setHint] = useState<0 | 1 | 2>(0)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (current || !typed.trim()) return
    const v = judge(typed, item.accepted)
    setVerdict(v)
    inputRef.current?.blur()
    onAnswer({ correct: v === 'correct', typed: typed.trim(), hinted: hint > 0 })
  }

  const giveUp = () => {
    if (current) return
    setVerdict('wrong')
    inputRef.current?.blur()
    onAnswer({ correct: false, typed: '', hinted: hint > 0 })
  }

  if (current) {
    return (
      <div className="flex flex-col gap-3">
        <div className={`flex flex-col gap-1 rounded-2xl p-4 ${current.correct ? 'bg-accent text-accent-fg' : 'bg-surface'}`}>
          <span className={`text-xs font-semibold ${current.correct ? 'opacity-70' : 'text-fg-subtle'}`}>정답</span>
          <span className="text-xl font-bold">{item.answer}</span>
          {current.typed && !current.correct && (
            <span className="text-sm text-fg-muted">
              내 답: <span className="text-wrong line-through decoration-wrong/60">{current.typed}</span>
            </span>
          )}
        </div>
        <Verdict
          correct={current.correct}
          text={
            current.correct
              ? current.hinted
                ? '정답이에요! 힌트를 써서 다시 한 번 나와요'
                : undefined
              : verdict === 'near'
                ? '거의 맞았어요! 오타인가요?'
                : current.typed
                  ? undefined
                  : '괜찮아요, 이제 알았으니까요'
          }
        />
        {!current.correct && current.typed && (
          <button
            onClick={onOverride}
            className={`self-start rounded-xl px-4 py-2.5 text-sm font-semibold ${
              verdict === 'near' ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-fg-muted'
            }`}
          >
            맞은 걸로 할게요
          </button>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <input
        ref={inputRef}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder="정답을 입력하세요"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="done"
        className="w-full rounded-2xl bg-surface px-5 py-4 text-lg font-semibold text-fg ring-1 ring-line outline-none placeholder:font-normal placeholder:text-fg-subtle focus:ring-2 focus:ring-accent"
      />
      {hint !== 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-accent/10 px-4 py-3">
          <Lightbulb size={16} className="shrink-0 text-accent" />
          <span className="text-lg font-bold tracking-[0.2em]">{hintText(item.answer, hint)}</span>
          <span className="ml-auto text-xs text-fg-muted">{[...item.answer.replace(/\s/g, '')].length}글자</span>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={hint === 2}
          onClick={() => setHint(hint === 0 ? 1 : 2)}
          className="rounded-xl bg-surface py-3 text-sm font-semibold text-fg-muted active:bg-surface-2 disabled:opacity-30"
        >
          {hint === 0 ? '힌트' : '힌트 더'}
        </button>
        <button
          type="button"
          onClick={giveUp}
          className="rounded-xl bg-surface py-3 text-sm font-semibold text-fg-muted active:bg-surface-2"
        >
          모르겠어요
        </button>
        <button
          type="submit"
          disabled={!typed.trim()}
          data-haptic="off"
          className="rounded-xl bg-accent py-3 text-sm font-bold text-accent-fg disabled:opacity-30"
        >
          확인
        </button>
      </div>
    </form>
  )
}

function Verdict({ correct, text }: { correct: boolean; text?: string }) {
  return (
    <p className={`pt-1 text-lg font-bold ${correct ? 'text-accent' : 'text-wrong'}`}>
      {text ?? (correct ? '정답이에요!' : '아쉬워요, 오답이에요')}
    </p>
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
      data-haptic="off"
      className={`flex min-h-14 items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-base font-medium transition-colors ${styles[state]}`}
    >
      <span
        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          state === 'idle' || state === 'dim' ? 'bg-surface-2 text-fg-muted' : ''
        }`}
      >
        {state === 'correct' ? (
          <Check size={18} strokeWidth={3} />
        ) : state === 'wrong' ? (
          <X size={18} strokeWidth={3} />
        ) : (
          number
        )}
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
            {hasAnswers ? '지금까지 푼 문제는 기록에 저장돼요.' : '아직 푼 문제가 없어요.'}
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
