// Small text conventions in the 일본어 단어 팩: a translation marks the Korean for the word in
// [brackets] (shown with a 형광펜), and a choice carries its reading in full-width parentheses,
// "電車（でんしゃ）", which stays hidden until the question is answered.

/** "[오늘]은 비가…" → [{ text: '오늘', mark: true }, { text: '은 비가…' }] */
export function markPieces(text: string) {
  return text
    .split(/(\[[^\]]+\])/)
    .filter(Boolean)
    .map((part) => (part.startsWith('[') && part.endsWith(']') ? { text: part.slice(1, -1), mark: true } : { text: part, mark: false }))
}

export const unmark = (text: string) => text.replace(/\[([^\]]+)\]/g, '$1')

/** "電車（でんしゃ）" → { word: '電車', reading: 'でんしゃ' } */
export function splitLabel(label: string) {
  const m = label.match(/^(.+)（(.+)）$/)
  return m ? { word: m[1], reading: m[2] } : { word: label }
}
