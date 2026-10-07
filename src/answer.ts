// Grading for 주관식: forgiving about spacing, punctuation, hanja/English aliases and units.

export type Verdict = 'correct' | 'near' | 'wrong'

export function normalize(s: string) {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/^\s*약\s*/, '')
    .replace(/[\s.,·'"‘’“”!?()[\]{}\-~_/:;「」『』<>]/g, '')
}

/** Leading number of an answer like "7개", "약 22개월", "1,000" → "7", "22", "1000". */
function numberOf(s: string) {
  const m = s.replace(/,/g, '').match(/\d+(\.\d+)?/)
  return m?.[0]
}

function levenshtein(a: string, b: string) {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]
}

export function judge(input: string, accepted: string[]): Verdict {
  const typed = normalize(input)
  if (!typed) return 'wrong'
  let near = false
  for (const answer of accepted) {
    const target = normalize(answer)
    if (typed === target) return 'correct'
    // Numbers: "7" or "7개" for "7개", "1억" for "1억 원". Whatever follows the number
    // must be part of the answer's unit, so "1천만" doesn't pass for "1억 원".
    const n = numberOf(answer)
    if (n && numberOf(input) === n) {
      const unit = normalize(input.replace(/,/g, '').replace(n, ''))
      if (target.includes(unit)) return 'correct'
    }
    if (target.length >= 3 && levenshtein(typed, target) === 1) near = true
  }
  return near ? 'near' : 'wrong'
}

/** Hint level 1 shows the length, level 2 also reveals the first character. */
export function hintText(answer: string, level: 1 | 2) {
  const chars = [...answer]
  return chars
    .map((c, i) => (c === ' ' ? ' ' : level === 2 && i === 0 ? c : '○'))
    .join('')
}

/** Answers short and unambiguous enough to type. */
export function isTypeable(answer: string) {
  return normalize(answer).length <= 12 && !/[,<>]/.test(answer)
}
