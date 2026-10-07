import { ChevronRight, Play, Square } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { ALL_CATEGORIES, CATEGORY_GROUPS } from '../categories'
import { Header, PrimaryButton, Screen, SecondaryButton, Segmented } from '../components/ui'
import { useBackHandler } from '../native'
import { pause, switchVoice, usePlayer } from '../player'
import { resetProgress, updateSettings, useStore } from '../store'
import { VOICES, type VoiceId } from '../stories'
import type { CategoryId } from '../types'

export function SettingsScreen({
  onBack,
  onCredits,
  onSounds,
}: {
  onBack: () => void
  onCredits: () => void
  onSounds: () => void
}) {
  const { settings } = useStore()
  const [confirmReset, setConfirmReset] = useState(false)

  useBackHandler(() => {
    onBack()
    return true
  })

  const included = ALL_CATEGORIES.length - settings.excluded.length
  const toggleCategory = (id: CategoryId) => {
    const excluded = settings.excluded.includes(id)
      ? settings.excluded.filter((c) => c !== id)
      : [...settings.excluded, id]
    // 종합 needs at least one category to draw from.
    if (excluded.length < ALL_CATEGORIES.length) updateSettings({ excluded })
  }

  return (
    <Screen>
      <Header title="설정" onBack={onBack} />
      <main className="flex flex-col gap-6 px-5 pt-2 pb-10">
        <Group title="화면">
          <Row label="테마">
            <div className="w-40">
              <Segmented
                value={settings.theme}
                onChange={(theme) => updateSettings({ theme })}
                options={[
                  { value: 'dark', label: '다크' },
                  { value: 'light', label: '라이트' },
                ]}
              />
            </div>
          </Row>
          <Row label="터치 진동">
            <Toggle on={settings.haptics} onChange={(haptics) => updateSettings({ haptics })} />
          </Row>
        </Group>

        <Group title="플레이">
          <Row label="방식">
            <div className="w-40">
              <Segmented
                value={settings.play}
                onChange={(play) => updateSettings({ play })}
                options={[
                  { value: 'normal', label: '일반' },
                  { value: 'game', label: '게임' },
                ]}
              />
            </div>
          </Row>
          <p className="-mt-2 text-xs text-fg-subtle">
            {settings.play === 'game'
              ? '점수, 콤보, 폭죽과 효과음이 함께해요.'
              : '효과 없이 차분하게 풀어요.'}
          </p>
          <Row label="효과음 (게임 모드)">
            <Toggle on={settings.sound} onChange={(sound) => updateSettings({ sound })} />
          </Row>
          <button onClick={onSounds} className="flex w-full items-center justify-between py-1 text-left">
            <span className="text-[15px]">효과음 고르기</span>
            <ChevronRight size={18} className="text-fg-subtle" />
          </button>
        </Group>

        <Group title="상식플러스">
          <VoicePicker />
        </Group>

        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-xs font-semibold text-fg-subtle">종합에 포함할 카테고리</h2>
            <span className="text-xs text-fg-subtle tabular-nums">
              {included}/{ALL_CATEGORIES.length}
            </span>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl bg-surface p-4">
            {CATEGORY_GROUPS.map((group) => (
              <div key={group.name} className="flex flex-col gap-2">
                <span className="text-[11px] text-fg-subtle">{group.name}</span>
                <div className="flex flex-wrap gap-2">
                  {group.categories.map((c) => {
                    const on = !settings.excluded.includes(c.id)
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleCategory(c.id)}
                        aria-pressed={on}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                          on ? 'bg-accent/15 text-fg ring-1 ring-accent/50' : 'bg-surface-2 text-fg-subtle line-through'
                        }`}
                      >
                        <c.icon size={14} strokeWidth={2} />
                        {c.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
            <p className="text-xs text-fg-subtle">끈 카테고리는 종합에서만 빠지고, 개별로는 계속 풀 수 있어요.</p>
          </div>
        </section>

        <Group title="정보">
          <button onClick={onCredits} className="flex w-full items-center justify-between py-1 text-left">
            <span className="text-[15px]">이미지·소리 출처</span>
            <ChevronRight size={18} className="text-fg-subtle" />
          </button>
          <Row label="버전">
            <span className="text-sm text-fg-muted">v{__APP_VERSION__}</span>
          </Row>
        </Group>

        <Group title="데이터">
          <button onClick={() => setConfirmReset(true)} className="w-full py-1 text-left text-[15px] text-wrong">
            학습 기록 초기화
          </button>
        </Group>
      </main>

      {confirmReset && (
        <ResetDialog
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            resetProgress()
            setConfirmReset(false)
          }}
        />
      )}
    </Screen>
  )
}

let previewAudio: HTMLAudioElement | null = null

/** 목소리 choice for 상식플러스, each with a short preview clip. */
function VoicePicker() {
  const { settings } = useStore()
  const { playing } = usePlayer()
  const [previewing, setPreviewing] = useState<VoiceId | null>(null)

  useEffect(() => () => previewAudio?.pause(), [])

  const preview = (id: VoiceId) => {
    previewAudio?.pause()
    if (previewing === id) {
      setPreviewing(null)
      return
    }
    if (playing) pause()
    previewAudio = new Audio(`${import.meta.env.BASE_URL}voices/${id}.mp3`)
    previewAudio.onended = () => setPreviewing(null)
    void previewAudio.play().catch(() => setPreviewing(null))
    setPreviewing(id)
  }

  const choose = (id: VoiceId) => {
    updateSettings({ storyVoice: id })
    switchVoice(id)
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[15px]">목소리</span>
      {VOICES.map((v) => {
        const on = settings.storyVoice === v.id
        return (
          <div key={v.id} className="flex items-center gap-2">
            <button
              onClick={() => choose(v.id)}
              aria-pressed={on}
              className={`flex flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                on ? 'bg-accent/15 ring-1 ring-accent/50' : 'bg-surface-2'
              }`}
            >
              <span className={`flex size-4 items-center justify-center rounded-full border-2 ${on ? 'border-accent' : 'border-fg-subtle'}`}>
                {on && <span className="size-2 rounded-full bg-accent" />}
              </span>
              <span className="flex flex-col">
                <span className="text-[15px] font-semibold">{v.name}</span>
                <span className="text-xs text-fg-subtle">{v.desc}</span>
              </span>
            </button>
            <button
              onClick={() => preview(v.id)}
              aria-label={`${v.name} 목소리 미리 듣기`}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-2"
            >
              {previewing === v.id ? <Square size={16} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>
          </div>
        )
      })}
      <p className="text-xs text-fg-subtle">듣던 이야기는 같은 자리에서 바뀐 목소리로 이어져요.</p>
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-xs font-semibold text-fg-subtle">{title}</h2>
      <div className="flex flex-col gap-4 rounded-2xl bg-surface p-4">{children}</div>
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[15px]">{label}</span>
      {children}
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 rounded-full transition-colors ${on ? 'bg-accent' : 'bg-surface-2'}`}
    >
      <span
        className={`absolute top-1 left-1 size-5 rounded-full shadow transition-transform ${
          on ? 'translate-x-5 bg-accent-fg' : 'bg-fg-subtle'
        }`}
      />
    </button>
  )
}

function ResetDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  useBackHandler(() => {
    onCancel()
    return true
  })
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative flex w-full max-w-sm flex-col gap-5 rounded-3xl bg-surface p-6">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-lg font-bold">학습 기록을 지울까요?</h2>
          <p className="text-sm text-fg-muted">푼 문제, 정답률, 오답노트가 모두 사라지고 되돌릴 수 없어요. 설정은 그대로예요.</p>
        </div>
        <div className="flex flex-col gap-2">
          <PrimaryButton onClick={onCancel}>취소</PrimaryButton>
          <SecondaryButton onClick={onConfirm}>모두 지우기</SecondaryButton>
        </div>
      </div>
    </div>
  )
}
