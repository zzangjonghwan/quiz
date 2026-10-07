import { ChevronLeft } from 'lucide-react'
import type { ReactNode } from 'react'

export function Screen({ children }: { children: ReactNode }) {
  return <div className="safe-area flex min-h-full flex-col">{children}</div>
}

export function Header({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-1 bg-bg px-2">
      <button aria-label="뒤로" onClick={onBack} className="rounded-full p-2 active:bg-surface-2">
        <ChevronLeft size={26} strokeWidth={1.75} />
      </button>
      <h1 className="flex-1 text-lg font-bold">{title}</h1>
      {right}
    </header>
  )
}

/** A row of mutually exclusive options (difficulty, question count). */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; sub?: string; disabled?: boolean }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={`flex flex-col items-center rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-30 ${
              selected ? 'bg-fg text-bg' : 'bg-surface-2 text-fg'
            }`}
          >
            {o.label}
            {o.sub && (
              <span className={`text-[11px] font-normal ${selected ? 'opacity-60' : 'text-fg-muted'}`}>
                {o.sub}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl bg-accent py-4 text-base font-bold text-accent-fg transition-transform active:scale-[0.98] disabled:opacity-30"
    >
      {children}
    </button>
  )
}

export function SecondaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl bg-surface-2 py-4 text-base font-bold text-fg transition-transform active:scale-[0.98]"
    >
      {children}
    </button>
  )
}
