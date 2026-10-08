import { useMemo, useState } from 'react'
import { CATEGORY_BY_ID, categoryGroups, MIXED_ICON } from '../categories'
import { Header, PrimaryButton, Screen, Segmented } from '../components/ui'
import type { QuestionBank } from '../data'
import { useBackHandler } from '../native'
import { collectPool, summarizePool, type SessionConfig } from '../session'
import { updateSettings, useStore } from '../store'
import type { CategoryId, QuizMode } from '../types'

export function CategorySelect({
  bank,
  mode,
  onBack,
  onStart,
}: {
  bank: QuestionBank
  mode: QuizMode
  onBack: () => void
  onStart: (config: SessionConfig) => void
}) {
  // undefined: sheet closed, null: 종합, otherwise a category.
  const [sheetFor, setSheetFor] = useState<CategoryId | null | undefined>(undefined)
  const { progress, settings } = useStore()

  useBackHandler(() => {
    onBack()
    return true
  })

  const perCategory = useMemo(() => {
    const result = new Map<CategoryId, { count: number; rate: number | null }>()
    for (const [id] of bank) {
      const pool = collectPool(bank, { mode, category: id, difficulty: 'mixed', excluded: [] })
      let correct = 0
      let answered = 0
      for (const { card } of pool) {
        const p = progress[card.id]
        if (p) {
          correct += p.correct
          answered += p.correct + p.wrong
        }
      }
      result.set(id, { count: pool.length, rate: answered ? Math.round((correct / answered) * 100) : null })
    }
    return result
  }, [bank, mode, progress])

  const mixedCount = collectPool(bank, {
    mode,
    category: null,
    difficulty: 'mixed',
    excluded: settings.excluded,
  }).length
  const MixedIcon = MIXED_ICON

  return (
    <Screen>
      <Header title={mode === 'mcq' ? '객관식' : '주관식'} onBack={onBack} />
      <main className="flex flex-col gap-6 px-5 pt-2 pb-8">
        <button
          onClick={() => setSheetFor(null)}
          className="flex items-center gap-4 rounded-2xl border border-accent/40 bg-surface p-5 text-left active:bg-surface-2"
        >
          <MixedIcon size={26} strokeWidth={1.75} className="text-accent" />
          <span className="flex flex-1 flex-col">
            <span className="text-lg font-bold">종합</span>
            <span className="text-sm text-fg-muted">
              {settings.excluded.length
                ? `${settings.excluded.length}개 카테고리 제외하고 섞어서`
                : '모든 카테고리에서 섞어서'}
            </span>
          </span>
          <span className="text-sm text-fg-muted tabular-nums">{mixedCount}</span>
        </button>

        {categoryGroups(bank.keys()).map((group) => (
          <section key={group.name} className="flex flex-col gap-2">
            <h2 className="px-1 text-xs font-semibold text-fg-subtle">{group.name}</h2>
            <div className="grid grid-cols-2 gap-2">
              {group.categories.map((c) => {
                const info = perCategory.get(c.id) ?? { count: 0, rate: null }
                return (
                  <button
                    key={c.id}
                    disabled={info.count === 0}
                    onClick={() => setSheetFor(c.id)}
                    className="flex items-center gap-3 rounded-2xl bg-surface p-4 text-left active:bg-surface-2 disabled:opacity-30"
                  >
                    <c.icon size={20} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
                    <span className="flex flex-1 flex-col">
                      <span className="text-[15px] leading-tight font-semibold">{c.name}</span>
                      <span className="text-[11px] text-fg-subtle tabular-nums">
                        {info.count}문제{info.rate !== null && ` · ${info.rate}%`}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </main>

      {sheetFor !== undefined && (
        <SetupSheet
          bank={bank}
          mode={mode}
          category={sheetFor}
          onClose={() => setSheetFor(undefined)}
          onStart={onStart}
        />
      )}
    </Screen>
  )
}

function SetupSheet({
  bank,
  mode,
  category,
  onClose,
  onStart,
}: {
  bank: QuestionBank
  mode: QuizMode
  category: CategoryId | null
  onClose: () => void
  onStart: (config: SessionConfig) => void
}) {
  const { progress, settings } = useStore()
  const { difficulty, count, play } = settings

  useBackHandler(() => {
    onClose()
    return true
  })

  const summaries = useMemo(() => {
    const summarize = (d: typeof difficulty) =>
      summarizePool(collectPool(bank, { mode, category, difficulty: d, excluded: settings.excluded }), progress)
    return {
      easy: summarize('easy'),
      normal: summarize('normal'),
      hard: summarize('hard'),
      mixed: summarize('mixed'),
    }
  }, [bank, mode, category, settings.excluded, progress])
  const current = summaries[difficulty]
  const actual = count === 'infinite' ? current.total : Math.min(count, current.total)

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative flex flex-col gap-6 rounded-t-3xl bg-surface px-5 pt-6"
        style={{ paddingBottom: 'calc(24px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))' }}
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold">{category ? CATEGORY_BY_ID[category].name : '종합'}</h2>
          <p className="text-sm text-fg-muted tabular-nums">
            새 문제 {current.fresh} · 복습할 문제 {current.due}
            {current.total > 0 && current.fresh === 0 && current.due === 0 && ' · 모두 풀었어요! 오래된 것부터 다시 나와요'}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-fg-muted">난이도</span>
          <Segmented
            value={difficulty}
            onChange={(v) => updateSettings({ difficulty: v })}
            options={[
              { value: 'easy', label: '쉬움', sub: `${summaries.easy.total}`, disabled: summaries.easy.total === 0 },
              { value: 'normal', label: '보통', sub: `${summaries.normal.total}`, disabled: summaries.normal.total === 0 },
              { value: 'hard', label: '어려움', sub: `${summaries.hard.total}`, disabled: summaries.hard.total === 0 },
              { value: 'mixed', label: '섞기', sub: `${summaries.mixed.total}` },
            ]}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-fg-muted">문제 수</span>
          <Segmented
            value={count}
            onChange={(v) => updateSettings({ count: v })}
            options={[
              { value: 10, label: '10' },
              { value: 20, label: '20' },
              { value: 30, label: '30' },
              { value: 'infinite', label: '무한' },
            ]}
          />
        </div>

        <PrimaryButton
          disabled={actual === 0}
          onClick={() => onStart({ mode, source: 'normal', category, difficulty, count, play })}
        >
          {count === 'infinite' ? '시작하기' : `${actual}문제 시작하기`}
        </PrimaryButton>
      </div>
    </div>
  )
}
