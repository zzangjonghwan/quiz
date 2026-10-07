import { Header, Screen } from '../components/ui'
import { CREDITS } from '../credits'
import { useBackHandler } from '../native'

export function Credits({ onBack }: { onBack: () => void }) {
  useBackHandler(() => {
    onBack()
    return true
  })
  return (
    <Screen>
      <Header title="이미지 출처" onBack={onBack} />
      <main className="flex flex-col gap-3 px-5 pt-2 pb-10">
        <p className="px-1 text-sm text-fg-muted">상식한입에 쓰인 이미지의 출처와 라이선스예요.</p>
        {Object.entries(CREDITS).map(([key, c]) => (
          <div key={key} className="flex flex-col gap-1.5 rounded-2xl bg-surface p-5">
            <span className="text-xs font-semibold text-accent">{c.usedFor}</span>
            <span className="font-bold">{c.title}</span>
            <span className="text-sm text-fg-muted">만든 이: {c.author}</span>
            <span className="text-sm text-fg-muted">라이선스: {c.license}</span>
            {c.url && <span className="text-xs break-all text-fg-subtle">{c.url}</span>}
          </div>
        ))}
      </main>
    </Screen>
  )
}
