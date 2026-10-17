// Pronunciation clips for the 일본어 단어 팩 (VOICEVOX:冥鳴ひまり, recorded by scripts/jp-audio.mjs).
// They live on the repo's `stories` branch next to the 상식플러스 audio and stream on demand, so
// the pack download stays small; without a connection the buttons just stay silent.
const BASE = import.meta.env.DEV ? '/.stories/jp/' : 'https://raw.githubusercontent.com/zzangjonghwan/quiz/stories/jp/'

let current: HTMLAudioElement | null = null

/** Plays a clip (stopping any other), and returns it so a button can show while it plays. */
export function playJp(file: string) {
  current?.pause()
  const audio = new Audio(BASE + file)
  current = audio
  void audio.play().catch(() => audio.dispatchEvent(new Event('ended')))
  return audio
}
