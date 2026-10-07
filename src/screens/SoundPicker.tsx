import { Check, Play } from 'lucide-react'
import { Header, Screen } from '../components/ui'
import { celebrate, fireworks, flashWrong } from '../fx'
import { useBackHandler } from '../native'
import { DEFAULT_PICKS, playVariant, SOUND_LABEL, VARIANTS, type SoundName } from '../sound'
import { updateSettings, useStore } from '../store'

/** Visual preview that goes with each effect, so sounds are judged in context. */
function previewFx(name: SoundName, el: HTMLElement) {
  const r = el.getBoundingClientRect()
  if (name === 'correct') fireworks(r.left + r.width / 2, r.top + r.height / 2, 1)
  if (name === 'wrong') flashWrong()
  if (name === 'fanfare' || name === 'combo') celebrate(2)
}

export function SoundPicker({ onBack }: { onBack: () => void }) {
  const { settings } = useStore()
  useBackHandler(() => {
    onBack()
    return true
  })

  return (
    <Screen>
      <Header title="효과음 고르기" onBack={onBack} />
      <main className="flex flex-col gap-5 px-5 pt-2 pb-10">
        <p className="px-1 text-sm text-fg-muted">
          효과마다 샘플을 눌러 들어 보고 마음에 드는 걸 고르세요. 게임 모드에서만 소리가 나요.
        </p>
        {(Object.keys(VARIANTS) as SoundName[]).map((name) => {
          const chosen = settings.soundPicks[name] ?? DEFAULT_PICKS[name]
          return (
            <section key={name} className="flex flex-col gap-2">
              <h2 className="px-1 text-xs font-semibold text-fg-subtle">{SOUND_LABEL[name]}</h2>
              <div className="flex flex-col divide-y divide-line rounded-2xl bg-surface">
                {VARIANTS[name].map((v, i) => {
                  const selected = v.id === chosen
                  return (
                    <div key={v.id} className="flex items-center gap-3 px-4 py-3">
                      <button
                        aria-label={`${v.label} 들어 보기`}
                        data-haptic="off"
                        onClick={(e) => {
                          playVariant(name, v.id)
                          previewFx(name, e.currentTarget)
                        }}
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-fg active:scale-95"
                      >
                        <Play size={16} strokeWidth={2.5} className="ml-0.5" />
                      </button>
                      <span className="flex-1 text-[15px]">
                        <span className="mr-1.5 text-xs font-bold text-fg-subtle">{String.fromCharCode(65 + i)}</span>
                        {v.label}
                        {v.id === DEFAULT_PICKS[name] && <span className="ml-1.5 text-xs text-fg-subtle">(추천)</span>}
                      </span>
                      <button
                        onClick={() => {
                          updateSettings({ soundPicks: { ...settings.soundPicks, [name]: v.id } })
                          playVariant(name, v.id)
                        }}
                        className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold ${
                          selected ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-fg-muted'
                        }`}
                      >
                        {selected && <Check size={14} strokeWidth={3} />}
                        {selected ? '선택됨' : '선택'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </main>
    </Screen>
  )
}
