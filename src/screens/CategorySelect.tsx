import { useMemo, useState } from 'react'
import { CATEGORY_BY_ID, CATEGORY_GROUPS, MIXED_ICON } from '../categories'
import { Header, PrimaryButton, Screen, Segmented } from '../components/ui'
import type { QuestionBank } from '../data'
import { useBackHandler } from '../native'
import { poolSize, type CountChoice, type DifficultyChoice, type SessionConfig } from '../session'
import type { CategoryId } from '../types'

const PREFS_KEY = 'setup-prefs'

function loadPrefs(): { difficulty: DifficultyChoice; count: CountChoice } {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null')
    if (saved?.difficulty && saved?.count) return saved
  } catch {
    // Storage unavailable: fall through to defaults.
  }
  return { difficulty: 'mixed', count: 10 }
}

function savePrefs(prefs: { difficulty: DifficultyChoice; count: CountChoice }) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Not critical.
  }
}

export function CategorySelect({
  bank,
  onBack,
  onStart,
}: {
  bank: QuestionBank
  onBack: () => void
  onStart: (config: SessionConfig) => void
}) {
  // undefined: sheet closed, null: 종합, otherwise a category.
  const [sheetFor, setSheetFor] = useState<CategoryId | null | undefined>(undefined)

  useBackHandler(() => {
    onBack()
    return true
  })

  const totalCount = poolSize(bank, null, 'mixed')
  const MixedIcon = MIXED_ICON

  return (
    <Screen>
      <Header title="카테고리" onBack={onBack} />
      <main className="flex flex-col gap-6 px-5 pt-2 pb-8">
        <button
          onClick={() => setSheetFor(null)}
          className="flex items-center gap-4 rounded-2xl border border-accent/40 bg-surface p-5 text-left active:bg-surface-2"
        >
          <MixedIcon size={26} strokeWidth={1.75} className="text-accent" />
          <span className="flex flex-1 flex-col">
            <span className="text-lg font-bold">종합</span>
            <span className="text-sm text-fg-muted">모든 카테고리에서 섞어서</span>
          </span>
          <span className="text-sm text-fg-muted tabular-nums">{totalCount}</span>
        </button>

        {CATEGORY_GROUPS.map((group) => (
          <section key={group.name} className="flex flex-col gap-2">
            <h2 className="px-1 text-xs font-semibold text-fg-subtle">{group.name}</h2>
            <div className="grid grid-cols-2 gap-2">
              {group.categories.map((c) => {
                const count = bank.get(c.id)?.length ?? 0
                return (
                  <button
                    key={c.id}
                    disabled={count === 0}
                    onClick={() => setSheetFor(c.id)}
                    className="flex items-center gap-3 rounded-2xl bg-surface p-4 text-left active:bg-surface-2 disabled:opacity-30"
                  >
                    <c.icon size={20} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
                    <span className="flex-1 text-[15px] font-semibold leading-tight">{c.name}</span>
                    <span className="text-xs text-fg-subtle tabular-nums">{count}</span>
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
  category,
  onClose,
  onStart,
}: {
  bank: QuestionBank
  category: CategoryId | null
  onClose: () => void
  onStart: (config: SessionConfig) => void
}) {
  const [prefs, setPrefs] = useState(loadPrefs)
  const { difficulty, count } = prefs

  useBackHandler(() => {
    onClose()
    return true
  })

  const sizes = useMemo(
    () => ({
      easy: poolSize(bank, category, 'easy'),
      normal: poolSize(bank, category, 'normal'),
      hard: poolSize(bank, category, 'hard'),
      mixed: poolSize(bank, category, 'mixed'),
    }),
    [bank, category],
  )
  const available = sizes[difficulty]
  const actual = count === 'infinite' ? available : Math.min(count, available)

  const update = (next: Partial<typeof prefs>) => {
    const merged = { ...prefs, ...next }
    setPrefs(merged)
    savePrefs(merged)
  }

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative flex flex-col gap-6 rounded-t-3xl bg-surface px-5 pt-6"
        style={{ paddingBottom: 'calc(24px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))' }}
      >
        <h2 className="text-xl font-bold">{category ? CATEGORY_BY_ID[category].name : '종합'}</h2>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-fg-muted">난이도</span>
          <Segmented
            value={difficulty}
            onChange={(v) => update({ difficulty: v })}
            options={[
              { value: 'easy', label: '쉬움', sub: `${sizes.easy}`, disabled: sizes.easy === 0 },
              { value: 'normal', label: '보통', sub: `${sizes.normal}`, disabled: sizes.normal === 0 },
              { value: 'hard', label: '어려움', sub: `${sizes.hard}`, disabled: sizes.hard === 0 },
              { value: 'mixed', label: '섞기', sub: `${sizes.mixed}` },
            ]}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-fg-muted">문제 수</span>
          <Segmented
            value={count}
            onChange={(v) => update({ count: v })}
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
          onClick={() => onStart({ category, difficulty, count })}
        >
          {count === 'infinite' ? '시작하기' : `${actual}문제 시작하기`}
        </PrimaryButton>
      </div>
    </div>
  )
}
