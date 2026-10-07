import { useMemo } from 'react'
import { CATEGORY_BY_ID, CATEGORY_GROUPS } from '../categories'
import { Header, Screen } from '../components/ui'
import type { QuestionBank } from '../data'
import { useBackHandler } from '../native'
import { useStore } from '../store'
import type { CategoryId } from '../types'

interface CategoryStat {
  id: CategoryId
  total: number
  seen: number
  correct: number
  answered: number
}

/** Answers needed before a category counts toward "약한 분야". */
const MIN_ANSWERS_FOR_WEAK = 5

export function StatsScreen({ bank, onBack }: { bank: QuestionBank; onBack: () => void }) {
  const { progress, stats } = useStore()
  useBackHandler(() => {
    onBack()
    return true
  })

  const { perCategory, stages, total } = useMemo(() => {
    const perCategory = new Map<CategoryId, CategoryStat>()
    const stages = { fresh: 0, learning: 0, familiar: 0, mastered: 0 }
    let total = 0
    for (const [id, cards] of bank) {
      const s: CategoryStat = { id, total: cards.length, seen: 0, correct: 0, answered: 0 }
      for (const card of cards) {
        total++
        const p = progress[card.id]
        if (!p) {
          stages.fresh++
          continue
        }
        s.seen++
        s.correct += p.correct
        s.answered += p.correct + p.wrong
        if (p.box >= 5) stages.mastered++
        else if (p.box >= 3) stages.familiar++
        else stages.learning++
      }
      perCategory.set(id, s)
    }
    return { perCategory, stages, total }
  }, [bank, progress])

  const rate = stats.answers ? Math.round((stats.correct / stats.answers) * 100) : null
  const seen = total - stages.fresh
  const weak = [...perCategory.values()]
    .filter((s) => s.answered >= MIN_ANSWERS_FOR_WEAK)
    .sort((a, b) => a.correct / a.answered - b.correct / b.answered)
    .slice(0, 3)

  return (
    <Screen>
      <Header title="내 기록" onBack={onBack} />
      <main className="flex flex-col gap-6 px-5 pt-2 pb-10">
        <section className="grid grid-cols-2 gap-3">
          <BigStat label="만난 문제" value={seen.toLocaleString()} sub={`/ ${total.toLocaleString()}`} />
          <BigStat label="정답률" value={rate === null ? '–' : `${rate}%`} />
          <BigStat label="푼 횟수" value={stats.answers.toLocaleString()} />
          <BigStat label="최고 연속 정답" value={stats.bestStreak.toLocaleString()} />
        </section>

        <section className="flex flex-col gap-3 rounded-2xl bg-surface p-5">
          <h2 className="text-sm font-semibold">학습 단계</h2>
          <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
            {[
              { n: stages.mastered, cls: 'bg-accent' },
              { n: stages.familiar, cls: 'bg-accent/60' },
              { n: stages.learning, cls: 'bg-accent/25' },
            ].map((s, i) => (
              <div key={i} className={s.cls} style={{ width: `${total ? (s.n / total) * 100 : 0}%` }} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-fg-muted">
            <Legend cls="bg-accent" label="완전히 외움" n={stages.mastered} />
            <Legend cls="bg-accent/60" label="거의 앎" n={stages.familiar} />
            <Legend cls="bg-accent/25" label="익히는 중" n={stages.learning} />
            <Legend cls="bg-surface-2" label="아직 안 만남" n={stages.fresh} />
          </div>
        </section>

        {weak.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="px-1 text-xs font-semibold text-fg-subtle">약한 분야</h2>
            <div className="grid grid-cols-3 gap-2">
              {weak.map((s) => {
                const c = CATEGORY_BY_ID[s.id]
                return (
                  <div key={s.id} className="flex flex-col gap-2 rounded-2xl bg-surface p-4">
                    <c.icon size={18} strokeWidth={1.75} className="text-wrong" />
                    <span className="text-sm leading-tight font-semibold">{c.name}</span>
                    <span className="text-lg font-bold text-wrong tabular-nums">
                      {Math.round((s.correct / s.answered) * 100)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {CATEGORY_GROUPS.map((group) => (
          <section key={group.name} className="flex flex-col gap-2">
            <h2 className="px-1 text-xs font-semibold text-fg-subtle">{group.name}</h2>
            <div className="flex flex-col divide-y divide-line rounded-2xl bg-surface">
              {group.categories.map((c) => {
                const s = perCategory.get(c.id)
                if (!s) return null
                const r = s.answered ? Math.round((s.correct / s.answered) * 100) : null
                return (
                  <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <c.icon size={18} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
                    <span className="w-24 shrink-0 text-sm font-medium">{c.name}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${r ?? 0}%` }} />
                    </div>
                    <span className="w-20 shrink-0 text-right text-xs text-fg-muted tabular-nums">
                      {r === null ? `0/${s.total}` : `${r}% · ${s.seen}/${s.total}`}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </main>
    </Screen>
  )
}

function BigStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-surface p-5">
      <span className="text-3xl font-extrabold tabular-nums">
        {value}
        {sub && <span className="text-sm font-medium text-fg-subtle"> {sub}</span>}
      </span>
      <span className="text-xs text-fg-muted">{label}</span>
    </div>
  )
}

function Legend({ cls, label, n }: { cls: string; label: string; n: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`size-2.5 rounded-sm ${cls}`} />
      {label}
      <span className="ml-auto tabular-nums">{n}</span>
    </span>
  )
}
