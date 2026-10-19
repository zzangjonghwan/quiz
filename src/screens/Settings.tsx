import { ChevronRight, Download, LoaderCircle, Trash2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { categoryGroups } from '../categories'
import { Header, PrimaryButton, Screen, SecondaryButton, Segmented, Toggle } from '../components/ui'
import { useBackHandler } from '../native'
import { fetchPackIndex, installPack, removePack, type PackInfo } from '../packs'
import { resetProgress, updateSettings, useStore } from '../store'
import { loadStories, removeDownloads } from '../stories'
import type { CategoryId } from '../types'

export function SettingsScreen({
  onBack,
  onCredits,
  onSounds,
  onPacksChanged,
}: {
  onBack: () => void
  onCredits: () => void
  onSounds: () => void
  onPacksChanged: () => void
}) {
  const { settings } = useStore()
  const [confirmReset, setConfirmReset] = useState(false)

  useBackHandler(() => {
    onBack()
    return true
  })

  const groups = categoryGroups(settings.packs.map((p) => p.category))
  const shown = groups.flatMap((g) => g.categories.map((c) => c.id))
  const included = shown.filter((id) => !settings.excluded.includes(id)).length
  const toggleCategory = (id: CategoryId) => {
    const excluded = settings.excluded.includes(id)
      ? settings.excluded.filter((c) => c !== id)
      : [...settings.excluded, id]
    // 종합 needs at least one category to draw from.
    if (shown.some((c) => !excluded.includes(c))) updateSettings({ excluded })
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

        <Group title="학습 팩">
          <PackList onChanged={onPacksChanged} />
        </Group>

        <Group title="오디오 팩">
          <StoryPack />
        </Group>

        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-xs font-semibold text-fg-subtle">종합에 포함할 카테고리</h2>
            <span className="text-xs text-fg-subtle tabular-nums">
              {included}/{shown.length}
            </span>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl bg-surface p-4">
            {groups.map((group) => (
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

/** Optional question packs: download, update or remove. */
function PackList({ onChanged }: { onChanged: () => void }) {
  const { settings } = useStore()
  const [index, setIndex] = useState<PackInfo[] | null>(null)
  const [offline, setOffline] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchPackIndex().then(setIndex, () => setOffline(true))
  }, [])

  const run = async (id: string, job: () => Promise<void>) => {
    setBusy(id)
    setError(null)
    try {
      await job()
      onChanged()
    } catch (e) {
      setError(`받지 못했어요. 인터넷 연결을 확인해 주세요. (${e instanceof Error ? e.message : String(e)})`)
    } finally {
      setBusy(null)
    }
  }

  // Installed packs are listed even offline, so they can still be removed.
  const installedOnly = settings.packs
    .filter((p) => !index?.some((i) => i.id === p.id))
    .map((p) => ({ id: p.id, category: p.category, name: p.id, desc: '', version: p.version, cards: 0, bytes: 0 }))
  const list = [...(index ?? []), ...installedOnly]

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-fg-subtle">원하는 사람만 받아서 푸는 문제 모음이에요. 받은 팩은 카테고리 목록에 따로 나타나요.</p>
      {!index && !offline && <span className="text-sm text-fg-muted">목록을 불러오는 중…</span>}
      {offline && !list.length && <span className="text-sm text-fg-muted">팩 목록을 보려면 인터넷 연결이 필요해요.</span>}
      {list.map((pack) => {
        const mine = settings.packs.find((p) => p.id === pack.id)
        const outdated = mine && pack.cards > 0 && pack.version > mine.version
        return (
          <div key={pack.id} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-3">
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-semibold">{pack.name}</span>
              {pack.desc && <span className="text-xs text-fg-muted">{pack.desc}</span>}
              {pack.cards > 0 && (
                <span className="text-[11px] text-fg-subtle tabular-nums">
                  {pack.cards}문제 · {Math.max(1, Math.round(pack.bytes / 1024))}KB
                  {mine && (outdated ? ' · 새 버전이 있어요' : ' · 받음')}
                </span>
              )}
            </span>
            {busy === pack.id ? (
              <LoaderCircle size={20} className="animate-spin text-fg-muted" />
            ) : mine && !outdated ? (
              <button
                onClick={() => void run(pack.id, () => removePack(pack.id))}
                aria-label={`${pack.name} 삭제`}
                className="flex size-10 items-center justify-center rounded-full text-fg-subtle active:bg-surface"
              >
                <Trash2 size={18} />
              </button>
            ) : (
              <button
                onClick={() => void run(pack.id, () => installPack(pack))}
                className="flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-sm font-bold text-accent-fg"
              >
                <Download size={15} strokeWidth={2.5} />
                {outdated ? '업데이트' : '받기'}
              </button>
            )}
          </div>
        )
      })}
      {error && <p className="text-xs text-wrong">{error}</p>}
    </div>
  )
}

/**
 * 상식플러스 오디오 팩. The story list ships with the app; 받기 turns the 상식플러스 tab on, and each
 * story's audio is downloaded when it's first played. 삭제 also clears those downloads.
 */
function StoryPack() {
  const { settings } = useStore()
  const [count, setCount] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    void loadStories().then((s) => setCount(s.length), () => {})
  }, [])
  const on = settings.storyPack
  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-3">
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-semibold">상식플러스 이야기</span>
        <span className="text-xs text-fg-muted">귀로 듣는 3분 교양 이야기. 들을 때 한 편씩 내려받아요</span>
        <span className="text-[11px] text-fg-subtle tabular-nums">
          {count ? `${count}편 · 모아 목소리` : '모아 목소리'}
          {on && ' · 받음'}
        </span>
      </span>
      {busy ? (
        <LoaderCircle size={20} className="animate-spin text-fg-muted" />
      ) : on ? (
        <button
          onClick={() => {
            setBusy(true)
            void removeDownloads().finally(() => {
              updateSettings({ storyPack: false })
              setBusy(false)
            })
          }}
          aria-label="상식플러스 이야기 삭제"
          className="flex size-10 items-center justify-center rounded-full text-fg-subtle active:bg-surface"
        >
          <Trash2 size={18} />
        </button>
      ) : (
        <button
          onClick={() => updateSettings({ storyPack: true })}
          className="flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-sm font-bold text-accent-fg"
        >
          <Download size={15} strokeWidth={2.5} />
          받기
        </button>
      )}
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
