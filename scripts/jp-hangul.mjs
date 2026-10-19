// Japanese as VOICEVOX says it (katakana moras) → Korean letters, for the 한국어 발음 option of the
// 왕초급·초급 packs: トイレワ ドコデスカ → 토이레와 도코데스카. It follows the sound, not the
// spelling, so the particle は comes out 와, and a long vowel is a dash (トオキョオ → 토-쿄-).
// ン and ッ close the syllable before them (ㄴ, and ㄱ/ㅂ/ㅅ by what follows: 갓코 → 각코).

const ROWS = {
  '': ['아', '이', '우', '에', '오'],
  K: ['카', '키', '쿠', '케', '코'],
  G: ['가', '기', '구', '게', '고'],
  S: ['사', '시', '스', '세', '소'],
  Z: ['자', '지', '즈', '제', '조'],
  T: ['타', '치', '츠', '테', '토'],
  D: ['다', '지', '즈', '데', '도'],
  N: ['나', '니', '누', '네', '노'],
  H: ['하', '히', '후', '헤', '호'],
  B: ['바', '비', '부', '베', '보'],
  P: ['파', '피', '푸', '페', '포'],
  M: ['마', '미', '무', '메', '모'],
  R: ['라', '리', '루', '레', '로'],
}
const KANA = {
  '': 'アイウエオ', K: 'カキクケコ', G: 'ガギグゲゴ', S: 'サシスセソ', Z: 'ザジズゼゾ', T: 'タチツテト', D: 'ダヂヅデド',
  N: 'ナニヌネノ', H: 'ハヒフヘホ', B: 'バビブベボ', P: 'パピプペポ', M: 'マミムメモ', R: 'ラリルレロ',
}
const ONE = { ヤ: '야', ユ: '유', ヨ: '요', ワ: '와', ヲ: '오', ヴ: '부', ァ: '아', ィ: '이', ゥ: '우', ェ: '에', ォ: '오' }
for (const [row, kana] of Object.entries(KANA)) [...kana].forEach((k, i) => (ONE[k] = ROWS[row][i]))

// Two-kana sounds: キャ 캬, シュ 슈, チョ 초, ティ 티, ファ 파 …
const TWO = {
  キャ: '캬', キュ: '큐', キョ: '쿄', ギャ: '갸', ギュ: '규', ギョ: '교', シャ: '샤', シュ: '슈', ショ: '쇼', ジャ: '자', ジュ: '주', ジョ: '조',
  チャ: '차', チュ: '추', チョ: '초', ヂャ: '자', ヂュ: '주', ヂョ: '조', ニャ: '냐', ニュ: '뉴', ニョ: '뇨', ヒャ: '햐', ヒュ: '휴', ヒョ: '효',
  ビャ: '뱌', ビュ: '뷰', ビョ: '뵤', ピャ: '퍄', ピュ: '퓨', ピョ: '표', ミャ: '먀', ミュ: '뮤', ミョ: '묘', リャ: '랴', リュ: '류', リョ: '료',
  シェ: '셰', ジェ: '제', チェ: '체', ティ: '티', ディ: '디', トゥ: '투', ドゥ: '두', ファ: '파', フィ: '피', フェ: '페', フォ: '포',
  ウィ: '위', ウェ: '웨', ウォ: '워', イェ: '예', ヴァ: '바', ヴィ: '비', ヴェ: '베', ヴォ: '보', デュ: '듀', テュ: '튜',
}

const JONG = { ㄱ: 1, ㄴ: 4, ㅂ: 17, ㅅ: 19 }
/** Puts a final consonant under the last syllable of `out`, or writes it on its own. */
function close(out, jamo) {
  const last = out.at(-1)
  const code = last?.charCodeAt(0) ?? 0
  if (code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 === 0) return out.slice(0, -1) + String.fromCharCode(code + JONG[jamo])
  return out + jamo
}

const VOWELS = 'aiueo'
/** The vowel a kana ends in (ャ → a), so a following long vowel can become a dash. */
const vowelOf = (k) => {
  const small = { ャ: 'a', ュ: 'u', ョ: 'o', ァ: 'a', ィ: 'i', ゥ: 'u', ェ: 'e', ォ: 'o', ワ: 'a', ヤ: 'a', ユ: 'u', ヨ: 'o', ヲ: 'o' }[k]
  if (small) return small
  for (const kana of Object.values(KANA)) if (kana.includes(k)) return VOWELS[kana.indexOf(k)]
  return ''
}
/** オ after an o-sound, イ after an e-sound … : the sound is just held. */
const LONG = { ア: 'a', イ: 'ie', ウ: 'uo', エ: 'e', オ: 'o' }

export function toHangul(kana) {
  const chars = [...kana]
  let out = ''
  let vowel = ''
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    const two = TWO[ch + (chars[i + 1] ?? '')]
    if (LONG[ch] && vowel && LONG[ch].includes(vowel)) {
      // Held once: シンゴオオ (信号を) is 신고-오, not 신고--.
      out += '-'
      vowel = ''
      continue
    }
    if (two) {
      out += two
      vowel = vowelOf(chars[i + 1])
      i++
    } else if (ch === 'ン') {
      out = close(out, 'ㄴ')
    } else if (ch === 'ッ') {
      // The next sound decides it: ッカ → ㄱ, ッパ → ㅂ, otherwise ㅅ.
      const next = chars[i + 1] ?? ''
      out = close(out, /[カキクケコ]/.test(next) ? 'ㄱ' : /[パピプペポ]/.test(next) ? 'ㅂ' : 'ㅅ')
    } else if (ch === 'ー') {
      out += '-'
    } else {
      out += ONE[ch] ?? ch
      vowel = vowelOf(ch)
      continue
    }
    if (!two) vowel = ''
  }
  return out
}
