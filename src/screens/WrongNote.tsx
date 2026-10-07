import { BookCheck, ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CATEGORY_BY_ID, ALL_CATEGORIES } from '../categories'
import { CardImage } from '../components/CardImage'
import { Explanation } from '../components/Explanation'
import { Header, PrimaryButton, Screen, SecondaryButton } from '../components/ui'
import { headlineAnswer, headlinePrompt, type QuestionBank } from '../data'
import { useBackHandler } from '../native'
import { subjectivePrompts, type SessionConfig } from '../session'
import { removeFromNote, useStore } from '../store'
import type { Card, CategoryId } from '../types'

export function WrongNote({
  bank,
  onBack,
  onStart,
}: {
  bank: QuestionBank
  onBack: () => void
  onStart: (config: SessionConfig) => void
}) {
  const { progress } = useStore()
  const [filter, setFilter] = useState<CategoryId | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  useBackHandler(() => {
    onBack()
    return true
  })

  // Most recently missed first.
  const entries = useMemo(() => {
    const list: { card: Card; category: CategoryId; wrong: number; last: number }[] = []
    for (const [category, cards] of bank) {
      for (const card of cards) {
        const p = progress[card.id]
        if (p?.inNote) list.push({ card, category, wrong: p.wrong, last: p.last })
      }
    }
    return list.sort((a, b) => b.last - a.last)
  }, [bank, progress])

  const categories = ALL_CATEGORIES.filter((c) => entries.some((e) => e.category === c.id))
  const shown = filter ? entries.filter((e) => e.category === filter) : entries
  const subjectiveCount = shown.filter((e) => subjectivePrompts(e.card).length > 0).length
  const start = (mode: SessionConfig['mode']) =>
    onStart({ mode, source: 'note', category: filter, difficulty: 'mixed', count: 'infinite' })

  return (
    <Screen>
      <Header title={`오답노트 ${entries.length || ''}`} onBack={onBack} />
      {entries.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 pb-20 text-center">
          <BookCheck size={40} strokeWidth={1.5} className="text-accent" />
          <p className="text-lg font-bold">오답노트가 비어 있어요</p>
          <p className="text-sm text-fg-muted">틀린 문제는 여기에 모이고, 다시 맞히면 졸업해요.</p>
        </div>
      ) : (
        <main className="flex flex-col gap-4 px-5 pt-2 pb-8">
          {categories.length > 1 && (
            <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
              <Chip label={`전체 ${entries.length}`} selected={filter === null} onClick={() => setFilter(null)} />
              {categories.map((c) => (
                <Chip
                  key={c.id}
                  label={`${c.name} ${entries.filter((e) => e.category === c.id).length}`}
                  selected={filter === c.id}
                  onClick={() => setFilter(c.id)}
                />
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <PrimaryButton onClick={() => start('mcq')}>객관식으로 {shown.length}</PrimaryButton>
            {subjectiveCount > 0 ? (
              <SecondaryButton onClick={() => start('subjective')}>주관식으로 {subjectiveCount}</SecondaryButton>
            ) : (
              <span />
            )}
          </div>

          <section className="flex flex-col gap-2">
            {shown.map(({ card, category, wrong }) => (
              <div key={card.id} className="overflow-hidden rounded-2xl bg-surface">
                <button
                  onClick={() => setOpen(open === card.id ? null : card.id)}
                  className="flex w-full items-center gap-3 p-4 text-left active:bg-surface-2"
                >
                  <span className="flex flex-1 flex-col gap-1">
                    <span className="text-[11px] text-fg-subtle">
                      {CATEGORY_BY_ID[category].name} · {wrong}번 틀림
                    </span>
                    <span className="text-[15px] leading-snug">{headlinePrompt(card)}</span>
                    <span className="text-sm text-fg-muted">정답: {headlineAnswer(card)}</span>
                  </span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-fg-subtle transition-transform ${open === card.id ? 'rotate-180' : ''}`}
                  />
                </button>
                {open === card.id && (
                  <div className="flex flex-col gap-2 px-2 pb-2">
                    {card.image && <CardImage image={card.image} size="small" />}
                    <Explanation card={card} />
                    <button
                      onClick={() => removeFromNote(card.id)}
                      className="rounded-xl py-3 text-sm font-semibold text-fg-muted active:bg-surface-2"
                    >
                      외웠어요, 노트에서 빼기
                    </button>
                  </div>
                )}
              </div>
            ))}
          </section>
        </main>
      )}
    </Screen>
  )
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap ${
        selected ? 'bg-fg text-bg' : 'bg-surface text-fg-muted'
      }`}
    >
      {label}
    </button>
  )
}
