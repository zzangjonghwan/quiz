import { Check, Flame, Lightbulb, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { hintText, judge, type Verdict } from '../answer'
import { CATEGORY_BY_ID, DIFFICULTY_LABEL } from '../categories'
import { CardImage } from '../components/CardImage'
import { Explanation } from '../components/Explanation'
import { PrimaryButton, Screen, SecondaryButton } from '../components/ui'
import { celebrate, clearFx, crumble, extinguish, fireworks, floatText, setFlame, shake } from '../fx'
import { comboLevel, isMilestone, pointsFor, type GameResult } from '../game'
import { hapticCorrect, hapticCrash, hapticWrong, useBackHandler } from '../native'
import type { AnswerRecord, McqItem, SessionConfig, SessionItem, SubjectiveItem } from '../session'
import { playSound, setGameAudio } from '../sound'
import { recordAnswer, replaceAnswer, type AnswerSnapshot } from '../store'

type Answer = Omit<AnswerRecord, 'item' | 'points'>

export function Quiz({
  config,
  items,
  onQuit,
  onFinish,
}: {
  config: SessionConfig
  items: SessionItem[]
  onQuit: () => void
  onFinish: (answers: AnswerRecord[], game?: GameResult) => void
}) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [confirmExit, setConfirmExit] = useState(false)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [score, setScore] = useState(0)
  const [banner, setBanner] = useState<{ text: string; key: number } | null>(null)
  const snapshot = useRef<AnswerSnapshot | null>(null)
  /** Combo before the last wrong answer, so "맞은 걸로 할게요" can restore it. */
  const comboBeforeMiss = useRef(0)
  const explanationRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLElement>(null)

  const game = config.play === 'game'
  const item = items[index]
  const current = answers[index] as AnswerRecord | undefined
  const isLast = index === items.length - 1
  const infinite = config.count === 'infinite'
  const correctCount = answers.filter((a) => a.correct).length
  const level = game ? comboLevel(combo) : 0

  useBackHandler(() => {
    setConfirmExit(true)
    return true
  })

  useEffect(() => {
    setGameAudio(game)
    return () => {
      setGameAudio(false)
      clearFx()
    }
  }, [game])

  useEffect(() => setFlame(level), [level])

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

  /** Applies the 게임 모드 reward for a correct answer and returns the points earned. */
  const celebrateCorrect = (nextCombo: number, hinted: boolean | undefined, origin: HTMLElement | null) => {
    const points = pointsFor(nextCombo, config.mode, hinted)
    const rect = origin?.getBoundingClientRect()
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
    fireworks(x, y, Math.min(3, 1 + comboLevel(nextCombo)))
    floatText(x, y - 24, `+${points}`)
    playSound('correct')
    if (isMilestone(nextCombo)) {
      setBanner({ text: `${nextCombo} COMBO!`, key: Date.now() })
      setTimeout(() => {
        playSound('combo')
        celebrate(nextCombo >= 10 ? 5 : 3)
      }, 180)
    }
    setCombo(nextCombo)
    setMaxCombo((m) => Math.max(m, nextCombo))
    setScore((s) => s + points)
    return points
  }

  const answer = (record: Answer, origin: HTMLElement | null) => {
    snapshot.current = recordAnswer(item.card.id, record.correct, record.hinted)
    let points: number | undefined
    if (record.correct) {
      hapticCorrect()
      if (game) points = celebrateCorrect(combo + 1, record.hinted, origin)
    } else if (game) {
      // "쿠구궁": the answer cracks and falls, the screen shakes, the fire goes out.
      hapticCrash()
      playSound('wrong')
      shake(mainRef.current)
      const rect = origin?.getBoundingClientRect()
      if (rect) setTimeout(() => crumble(rect), 140)
      if (combo >= 3) extinguish()
      comboBeforeMiss.current = combo
      setCombo(0)
    } else {
      hapticWrong()
    }
    setAnswers([...answers, { item, ...record, points }])
  }

  // 주관식 "맞은 걸로 할게요": re-grade the last answer as correct.
  const overrideCorrect = (origin: HTMLElement | null) => {
    if (!current || current.correct || !snapshot.current) return
    hapticCorrect()
    snapshot.current = replaceAnswer(snapshot.current, true, current.hinted)
    const points = game ? celebrateCorrect(comboBeforeMiss.current + 1, current.hinted, origin) : undefined
    setAnswers(answers.map((a, i) => (i === index ? { ...a, correct: true, points } : a)))
  }

  const finish = () => onFinish(answers, game ? { score, maxCombo } : undefined)

  const next = () => {
    if (isLast) finish()
    else setIndex(index + 1)
  }

  const cat = CATEGORY_BY_ID[item.category]

  return (
    <Screen>
      {game && level > 0 && <div className={`pointer-events-none fixed inset-0 z-[5] fx-burn-${level}`} />}

      <header className="sticky top-0 z-10 flex flex-col gap-2 bg-bg px-2 pt-2 pb-3">
        <div className="flex h-10 items-center gap-2">
          <button aria-label="그만하기" onClick={() => setConfirmExit(true)} className="rounded-full p-2 active:bg-surface-2">
            <X size={24} strokeWidth={1.75} />
          </button>
          <span className="flex-1 text-sm font-semibold tabular-nums">
            {infinite ? `${index + 1}번째` : `${index + 1} / ${items.length}`}
          </span>
          {game ? (
            <>
              {combo >= 2 && (
                <span
                  className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-sm font-extrabold tabular-nums ${
                    level > 0 ? 'fx-pulse bg-orange-500/20 text-orange-400' : 'text-fg-muted'
                  }`}
                >
                  <Flame size={15} strokeWidth={2.5} className={level > 0 ? 'fill-orange-400/60' : ''} />
                  {combo}
                </span>
              )}
              <span key={score} className="fx-pop pr-3 text-base font-extrabold text-accent tabular-nums">
                {score.toLocaleString()}
              </span>
            </>
          ) : (
            <span className="pr-3 text-sm text-fg-muted tabular-nums">
              <span className="text-accent">{correctCount}</span> 정답
            </span>
          )}
        </div>
        {!infinite && (
          <div className="mx-3 h-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className={`h-full rounded-full transition-[width] duration-300 ${level > 0 ? 'bg-orange-400' : 'bg-accent'}`}
              style={{ width: `${((index + (current ? 1 : 0)) / items.length) * 100}%` }}
            />
          </div>
        )}
      </header>

      <main ref={mainRef} className="flex flex-1 flex-col gap-6 overflow-x-clip px-5 pt-4 pb-32">
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
          <McqChoices
            key={index}
            item={item}
            current={current}
            shatter={game}
            onAnswer={(pickedIndex, el) => answer({ correct: pickedIndex === item.correctIndex, pickedIndex }, el)}
          />
        ) : (
          <SubjectiveInput key={index} item={item} current={current} onAnswer={answer} onOverride={overrideCorrect} />
        )}

        {current && (
          <div ref={explanationRef} className="flex flex-col gap-3">
            <Explanation card={item.card} />
          </div>
        )}
      </main>

      {banner && (
        <div key={banner.key} className="pointer-events-none fixed inset-x-0 top-1/3 z-[70] flex justify-center">
          <span
            className="fx-banner text-5xl font-black text-orange-400 italic"
            style={{ textShadow: '0 0 18px rgba(255,120,0,0.8), 0 3px 0 rgba(0,0,0,0.6)' }}
            onAnimationEnd={() => setBanner(null)}
          >
            {banner.text}
          </span>
        </div>
      )}

      {current && (
        <div
          className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-bg via-bg to-transparent px-5 pt-6"
          style={{ paddingBottom: 'calc(16px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))' }}
        >
          <PrimaryButton onClick={next}>{isLast ? '결과 보기' : '다음 문제'}</PrimaryButton>
        </div>
      )}

      {confirmExit && (
        <ExitDialog
          hasAnswers={answers.length > 0}
          onCancel={() => setConfirmExit(false)}
          onConfirm={() => (answers.length > 0 ? finish() : onQuit())}
        />
      )}
    </Screen>
  )
}

function McqChoices({
  item,
  current,
  shatter,
  onAnswer,
}: {
  item: McqItem
  current: AnswerRecord | undefined
  shatter: boolean
  onAnswer: (pickedIndex: number, el: HTMLElement) => void
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {item.choices.map((choice, i) => (
        <ChoiceButton
          key={i}
          label={choice}
          number={i + 1}
          shatter={shatter}
          state={
            !current
              ? 'idle'
              : i === item.correctIndex
                ? 'correct'
                : i === current.pickedIndex
                  ? 'wrong'
                  : 'dim'
          }
          onClick={(el) => !current && onAnswer(i, el)}
        />
      ))}
      {current && <Verdict correct={current.correct} points={current.points} />}
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
  onAnswer: (record: Answer, origin: HTMLElement | null) => void
  onOverride: (origin: HTMLElement | null) => void
}) {
  const [typed, setTyped] = useState('')
  const [hint, setHint] = useState<0 | 1 | 2>(0)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const boxRef = useRef<HTMLFormElement>(null)
  const answerRef = useRef<HTMLDivElement>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (current || !typed.trim()) return
    const v = judge(typed, item.accepted)
    setVerdict(v)
    inputRef.current?.blur()
    onAnswer({ correct: v === 'correct', typed: typed.trim(), hinted: hint > 0 }, inputRef.current)
  }

  const giveUp = () => {
    if (current) return
    setVerdict('wrong')
    inputRef.current?.blur()
    onAnswer({ correct: false, typed: '', hinted: hint > 0 }, boxRef.current)
  }

  if (current) {
    return (
      <div className="flex flex-col gap-3">
        <div
          ref={answerRef}
          className={`flex flex-col gap-1 rounded-2xl p-4 ${current.correct ? 'bg-accent text-accent-fg' : 'bg-surface'}`}
        >
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
          points={current.points}
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
            onClick={() => onOverride(answerRef.current)}
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
    <form ref={boxRef} onSubmit={submit} className="flex flex-col gap-3">
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
          data-haptic="off"
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

function Verdict({ correct, text, points }: { correct: boolean; text?: string; points?: number }) {
  return (
    <p className={`flex items-baseline gap-2 pt-1 text-lg font-bold ${correct ? 'text-accent' : 'text-wrong'}`}>
      {text ?? (correct ? '정답이에요!' : '아쉬워요, 오답이에요')}
      {points !== undefined && <span className="text-sm font-extrabold tabular-nums">+{points}</span>}
    </p>
  )
}

type ChoiceState = 'idle' | 'correct' | 'wrong' | 'dim'

const CHOICE_STYLES: Record<ChoiceState, string> = {
  idle: 'bg-surface active:bg-surface-2',
  correct: 'bg-accent text-accent-fg',
  wrong: 'bg-wrong/15 text-wrong ring-1 ring-wrong/60',
  dim: 'bg-surface opacity-40',
}

function ChoiceButton({
  label,
  number,
  state,
  shatter,
  onClick,
}: {
  label: string
  number: number
  state: ChoiceState
  /** 게임 모드: a wrong pick cracks in two and falls away. */
  shatter: boolean
  onClick: (el: HTMLElement) => void
}) {
  const breaking = shatter && state === 'wrong'
  const [fallen, setFallen] = useState(false)

  const content = (s: ChoiceState) => (
    <>
      <span
        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          s === 'idle' || s === 'dim' ? 'bg-surface-2 text-fg-muted' : ''
        }`}
      >
        {s === 'correct' ? <Check size={18} strokeWidth={3} /> : s === 'wrong' ? <X size={18} strokeWidth={3} /> : number}
      </span>
      <span className="flex-1">{label}</span>
    </>
  )
  const base = 'flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-base font-medium'

  return (
    <div className="relative">
      <button
        onClick={(e) => onClick(e.currentTarget)}
        disabled={state !== 'idle'}
        data-haptic="off"
        className={`${base} transition-colors ${
          breaking
            ? 'text-wrong/50 line-through decoration-wrong/40 outline-2 outline-wrong/30 outline-dashed'
            : CHOICE_STYLES[state]
        }`}
      >
        {content(state)}
      </button>
      {breaking && !fallen && (
        <>
          <div aria-hidden className={`${base} pointer-events-none absolute inset-0 fx-half-left fx-fall-left ${CHOICE_STYLES.wrong}`}>
            {content('wrong')}
          </div>
          <div
            aria-hidden
            className={`${base} pointer-events-none absolute inset-0 fx-half-right fx-fall-right ${CHOICE_STYLES.wrong}`}
            onAnimationEnd={() => setFallen(true)}
          >
            {content('wrong')}
          </div>
          <svg aria-hidden className="fx-crack pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points="49,0 55,28 45,52 56,76 50,100" fill="none" stroke="#fff" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
          </svg>
        </>
      )}
    </div>
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
