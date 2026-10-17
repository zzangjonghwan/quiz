import { Volume2 } from 'lucide-react'
import { playJp } from '../jpAudio'

/** Plays a 일본어 단어 팩 pronunciation clip. */
export function SpeakButton({ file, label = '발음 듣기', size = 18 }: { file: string; label?: string; size?: number }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        playJp(file)
      }}
      aria-label={label}
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-accent active:scale-95"
    >
      <Volume2 size={size} strokeWidth={2.2} />
    </button>
  )
}
