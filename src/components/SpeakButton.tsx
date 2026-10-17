import { Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { playJp } from '../jpAudio'

/**
 * Plays a 일본어 단어 팩 pronunciation clip. A press squashes the button and it bounces back
 * with a ring going out, and it stays lit while the clip plays, so a tap clearly lands.
 */
export function SpeakButton({ file, label = '발음 듣기', size = 18 }: { file: string; label?: string; size?: number }) {
  const [press, setPress] = useState(0)
  const [playing, setPlaying] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)
  useEffect(() => () => audio.current?.pause(), [])
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        setPress((n) => n + 1)
        const a = playJp(file)
        audio.current = a
        setPlaying(true)
        const stop = () => audio.current === a && setPlaying(false)
        a.addEventListener('ended', stop)
        a.addEventListener('pause', stop)
      }}
      aria-label={label}
      className="group relative size-10 shrink-0"
    >
      {press > 0 && <span key={`r${press}`} className="fx-ring pointer-events-none absolute inset-0 rounded-full border-2 border-accent" />}
      <span
        key={press}
        className={`flex size-full items-center justify-center rounded-full transition-[color,background-color,transform] duration-150 group-active:scale-[0.82] ${
          playing ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-accent'
        } ${press > 0 ? 'fx-speak' : ''}`}
      >
        <Volume2 size={size} strokeWidth={2.2} />
      </span>
    </button>
  )
}
