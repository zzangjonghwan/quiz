import { useEffect, useState } from 'react'
import { loadBank, type QuestionBank } from './data'
import { CategorySelect } from './screens/CategorySelect'
import { Home } from './screens/Home'
import { Quiz } from './screens/Quiz'
import { Result } from './screens/Result'
import { buildSession, type AnswerRecord, type SessionConfig, type SessionItem } from './session'

type Screen =
  | { name: 'home' }
  | { name: 'categories' }
  | { name: 'quiz'; config: SessionConfig; items: SessionItem[] }
  | { name: 'result'; config: SessionConfig; answers: AnswerRecord[]; durationMs: number }

export default function App() {
  const [bank, setBank] = useState<QuestionBank | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>({ name: 'home' })

  useEffect(() => {
    loadBank().then(setBank, (e: unknown) => setLoadError(String(e)))
  }, [])

  if (loadError) {
    return <Centered>문제를 불러오지 못했어요.<br />{loadError}</Centered>
  }
  if (!bank) return <Centered>불러오는 중…</Centered>

  const startQuiz = (config: SessionConfig) =>
    setScreen({ name: 'quiz', config, items: buildSession(bank, config) })

  switch (screen.name) {
    case 'home':
      return <Home bank={bank} onStartMcq={() => setScreen({ name: 'categories' })} />
    case 'categories':
      return (
        <CategorySelect
          bank={bank}
          onBack={() => setScreen({ name: 'home' })}
          onStart={startQuiz}
        />
      )
    case 'quiz':
      return (
        <Quiz
          key={screen.items.map((i) => i.card.id).join()}
          config={screen.config}
          items={screen.items}
          onQuit={() => setScreen({ name: 'home' })}
          onFinish={(answers, durationMs) =>
            setScreen({ name: 'result', config: screen.config, answers, durationMs })
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
          onHome={() => setScreen({ name: 'home' })}
        />
      )
  }
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="safe-area flex min-h-full items-center justify-center p-8 text-center text-fg-muted">
      <p>{children}</p>
    </div>
  )
}
