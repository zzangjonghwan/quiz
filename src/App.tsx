import { useEffect, useState } from 'react'
import { loadBank, type QuestionBank } from './data'
import { applyTheme } from './native'
import { CategorySelect } from './screens/CategorySelect'
import { Credits } from './screens/Credits'
import { Home } from './screens/Home'
import { Quiz } from './screens/Quiz'
import { Result } from './screens/Result'
import { SettingsScreen } from './screens/Settings'
import { StatsScreen } from './screens/Stats'
import { WrongNote } from './screens/WrongNote'
import { buildSession, type AnswerRecord, type SessionConfig, type SessionItem } from './session'
import { getState, loadStore, useStore } from './store'
import type { QuizMode } from './types'

type Screen =
  | { name: 'home' }
  | { name: 'categories'; mode: QuizMode }
  | { name: 'quiz'; config: SessionConfig; items: SessionItem[]; startedAt: number }
  | { name: 'result'; config: SessionConfig; answers: AnswerRecord[]; durationMs: number }
  | { name: 'note' }
  | { name: 'stats' }
  | { name: 'settings' }
  | { name: 'credits' }

export default function App() {
  const [bank, setBank] = useState<QuestionBank | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const { settings } = useStore()

  useEffect(() => {
    Promise.all([loadBank(), loadStore()]).then(([b]) => setBank(b), (e: unknown) => setLoadError(String(e)))
  }, [])

  useEffect(() => applyTheme(settings.theme), [settings.theme])

  if (loadError) {
    return <Centered>문제를 불러오지 못했어요.<br />{loadError}</Centered>
  }
  if (!bank) return <Centered>불러오는 중…</Centered>

  const home = () => setScreen({ name: 'home' })
  const startQuiz = (config: SessionConfig) => {
    const { progress, settings } = getState()
    const items = buildSession(bank, progress, config, settings.excluded)
    setScreen({ name: 'quiz', config, items, startedAt: Date.now() })
  }
  // Sessions started from the 오답노트 return there, everything else returns home.
  const back = (config: SessionConfig) => (config.source === 'note' ? setScreen({ name: 'note' }) : home())

  switch (screen.name) {
    case 'home':
      return (
        <Home
          bank={bank}
          onStart={(mode) => setScreen({ name: 'categories', mode })}
          onNote={() => setScreen({ name: 'note' })}
          onStats={() => setScreen({ name: 'stats' })}
          onSettings={() => setScreen({ name: 'settings' })}
        />
      )
    case 'categories':
      return <CategorySelect bank={bank} mode={screen.mode} onBack={home} onStart={startQuiz} />
    case 'quiz':
      return (
        <Quiz
          key={screen.startedAt}
          items={screen.items}
          config={screen.config}
          onQuit={() => back(screen.config)}
          onFinish={(answers) =>
            setScreen({
              name: 'result',
              config: screen.config,
              answers,
              durationMs: Date.now() - screen.startedAt,
            })
          }
        />
      )
    case 'result':
      return (
        <Result
          config={screen.config}
          answers={screen.answers}
          durationMs={screen.durationMs}
          onRetry={() => startQuiz(screen.config)}
          onHome={() => back(screen.config)}
        />
      )
    case 'note':
      return <WrongNote bank={bank} onBack={home} onStart={startQuiz} />
    case 'stats':
      return <StatsScreen bank={bank} onBack={home} />
    case 'settings':
      return <SettingsScreen onBack={home} onCredits={() => setScreen({ name: 'credits' })} />
    case 'credits':
      return <Credits onBack={() => setScreen({ name: 'settings' })} />
  }
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="safe-area flex min-h-full items-center justify-center p-8 text-center text-fg-muted">
      <p>{children}</p>
    </div>
  )
}
