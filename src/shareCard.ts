// 결과 공유 카드: draws the quiz result as an image (1080×1350, the size Instagram and KakaoTalk
// show whole) and hands it to the system share sheet. The card carries one question from the
// round as a challenge, and the web version's address so a friend can try it without installing.
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { markPieces, unmark } from './marks'

export const WEB_URL = 'https://zzangjonghwan.github.io/quiz/'

export interface ShareCardData {
  /** e.g. "사자성어 · 보통" */
  subtitle: string
  correct: number
  total: number
  comment: string
  duration: string
  game?: { score: number; maxCombo: number }
  /** A question from the round, without its answer, for friends to try. */
  challenge?: { prompt: string; glyph?: string; choices: string[] }
}

const W = 1080
const H = 1350
const PAD = 88
// Always the dark brand look, whatever theme the app is in.
const C = {
  bg: '#0b0b0c',
  surface: '#161618',
  surface2: '#202023',
  fg: '#f4f4f5',
  muted: '#9a9aa2',
  subtle: '#5e5e66',
  accent: '#c6f432',
}
const FONT = '"Pretendard Variable", Pretendard, system-ui, sans-serif'
const font = (weight: number, size: number) => `${weight} ${size}px ${FONT}`

/** Splits text into lines that fit `width`, breaking between words where possible. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number) {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/(\s+)/)) {
    const next = line + word
    if (ctx.measureText(next).width <= width || !line.trim()) {
      line = next
      // A single word wider than the line is broken by character.
      while (ctx.measureText(line).width > width) {
        let cut = line.length - 1
        while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > width) cut--
        lines.push(line.slice(0, cut))
        line = line.slice(cut)
      }
    } else {
      lines.push(line.trimEnd())
      line = word.trimStart()
    }
  }
  if (line.trim()) lines.push(line.trimEnd())
  if (lines.length > maxLines) {
    lines.length = maxLines
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.?$/, '…')
  }
  return lines
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fillStyle = fill
  ctx.fill()
}

export async function drawResultCard(data: ShareCardData) {
  // Pretendard is split into subsets by character; make sure every glyph on the card is loaded.
  const text = JSON.stringify(data) + '상식한입0123456789/%·…점콤보최대걸린시간정답률이문제맞힐수있어?너도풀어보기'
  await Promise.all([400, 600, 800].map((w) => document.fonts.load(font(w, 40), text))).catch(() => {})

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, W, H)
  ctx.textBaseline = 'alphabetic'

  // Logo
  ctx.font = font(800, 52)
  ctx.fillStyle = C.fg
  ctx.fillText('상식', PAD, PAD + 44)
  ctx.fillStyle = C.accent
  ctx.fillText('한입', PAD + ctx.measureText('상식').width, PAD + 44)

  // Category and score
  let y = PAD + 150
  ctx.font = font(600, 36)
  ctx.fillStyle = C.muted
  ctx.fillText(data.subtitle, PAD, y)
  y += 150
  ctx.font = font(800, 168)
  ctx.fillStyle = C.accent
  const score = String(data.correct)
  ctx.fillText(score, PAD, y)
  ctx.fillStyle = C.subtle
  ctx.fillText(` / ${data.total}`, PAD + ctx.measureText(score).width, y)
  y += 66
  ctx.font = font(400, 36)
  ctx.fillStyle = C.fg
  for (const line of wrap(ctx, data.comment, W - PAD * 2, 2)) {
    ctx.fillText(line, PAD, y)
    y += 50
  }

  // Stats
  y += 24
  const stats: [string, string][] = [
    ['정답률', `${data.total ? Math.round((data.correct / data.total) * 100) : 0}%`],
    ['걸린 시간', data.duration],
  ]
  if (data.game) stats.push(['게임 점수', data.game.score.toLocaleString()], ['최대 콤보', `${data.game.maxCombo}`])
  const cols = stats.length > 2 ? 4 : 2
  const boxH = 150
  roundRect(ctx, PAD, y, W - PAD * 2, boxH, 32, C.surface)
  const colW = (W - PAD * 2) / cols
  stats.forEach(([label, value], i) => {
    const x = PAD + colW * i + 40
    ctx.font = font(800, cols > 2 ? 44 : 52)
    ctx.fillStyle = C.fg
    ctx.fillText(value, x, y + 78)
    ctx.font = font(400, 28)
    ctx.fillStyle = C.muted
    ctx.fillText(label, x, y + 120)
  })
  y += boxH + 48

  // Challenge question
  const footerTop = H - PAD - 60
  if (data.challenge) {
    const q = data.challenge
    const inner = W - PAD * 2 - 96
    ctx.font = font(600, 40)
    const promptLines = wrap(ctx, q.glyph ? `${q.glyph} · ${q.prompt}` : q.prompt, inner, 3)
    // Short choices go in a 2×2 grid, long ones one per row. All four or none: a cut-off list
    // could leave out the answer.
    const rowW = W - PAD * 2 - 64
    ctx.font = font(400, 32)
    const grid = q.choices.every((c) => ctx.measureText(c).width <= rowW / 2 - 100)
    const rows = grid ? Math.ceil(q.choices.length / 2) : q.choices.length
    const choicesTop = y + 108 + promptLines.length * 54 + 12
    const boxH = choicesTop - y + rows * 74 + 28
    if (y + boxH <= footerTop - 40) {
      roundRect(ctx, PAD, y, W - PAD * 2, boxH, 32, C.surface)
      ctx.font = font(600, 30)
      ctx.fillStyle = C.accent
      ctx.fillText('이 문제, 맞힐 수 있어?', PAD + 48, y + 78)
      ctx.font = font(600, 40)
      ctx.fillStyle = C.fg
      promptLines.forEach((line, i) => ctx.fillText(line, PAD + 48, y + 108 + (i + 1) * 54 - 8))
      const cellW = grid ? (rowW - 14) / 2 : rowW
      q.choices.forEach((choice, i) => {
        const left = PAD + 32 + (grid ? (i % 2) * (cellW + 14) : 0)
        const top = choicesTop + (grid ? Math.floor(i / 2) : i) * 74
        roundRect(ctx, left, top, cellW, 60, 18, C.surface2)
        ctx.font = font(600, 28)
        ctx.fillStyle = C.muted
        ctx.fillText(String(i + 1), left + 28, top + 40)
        ctx.font = font(400, 32)
        ctx.fillStyle = C.fg
        ctx.fillText(wrap(ctx, choice, cellW - 100, 1)[0] ?? '', left + 72, top + 42)
      })
    }
  }

  // Footer: where friends can play
  ctx.font = font(600, 32)
  ctx.fillStyle = C.fg
  ctx.fillText('너도 풀어 보기', PAD, H - PAD - 44)
  ctx.font = font(400, 30)
  ctx.fillStyle = C.muted
  ctx.fillText(WEB_URL.replace(/^https:\/\//, '').replace(/\/$/, ''), PAD, H - PAD)
  return canvas
}

/** Opens the share sheet with an image and text (or downloads the image where sharing files isn't possible). */
async function shareImage(canvas: HTMLCanvasElement, text: string, name: string, dialogTitle: string) {
  if (Capacitor.isNativePlatform()) {
    const base64 = canvas.toDataURL('image/png').split(',')[1]
    const { uri } = await Filesystem.writeFile({
      path: `share/${name}-${Date.now()}.png`,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
    })
    await Share.share({ title: '상식한입', text, files: [uri], dialogTitle })
    return
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('이미지를 만들지 못했어요')
  const file = new File([blob], `상식한입-${name}.png`, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], text })
    return
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
}

/** Draws the result card and opens the share sheet. */
export async function shareResult(data: ShareCardData) {
  const canvas = await drawResultCard(data)
  const text = `상식한입 ${data.subtitle} ${data.correct}/${data.total} 맞혔어요. 너도 풀어 봐 → ${WEB_URL}`
  await shareImage(canvas, text, '결과', '결과 공유')
}

export interface QuestionCardData {
  /** e.g. "일본어 단어" */
  category: string
  prompt: string
  glyph?: string
  glyphSub?: string
  choices: string[]
  /** Opens this exact question in the web version. */
  link: string
}

/** One question without its answer, to throw at a group chat (단톡방에 내기). */
export async function drawQuestionCard(data: QuestionCardData) {
  const text = JSON.stringify(data) + '상식한입이문제맞힐수있어?정답은여기서'
  await Promise.all([400, 600, 800].map((w) => document.fonts.load(font(w, 40), text))).catch(() => {})

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, W, H)

  ctx.font = font(800, 52)
  ctx.fillStyle = C.fg
  ctx.fillText('상식', PAD, PAD + 44)
  ctx.fillStyle = C.accent
  ctx.fillText('한입', PAD + ctx.measureText('상식').width, PAD + 44)

  let y = PAD + 140
  ctx.font = font(600, 32)
  ctx.fillStyle = C.accent
  ctx.fillText(`${data.category} · 이 문제, 맞힐 수 있어?`, PAD, y)
  y += 40
  ctx.font = font(800, 50)
  ctx.fillStyle = C.fg
  for (const line of wrap(ctx, data.prompt, W - PAD * 2, 3)) {
    y += 66
    ctx.fillText(line, PAD, y)
  }

  if (data.glyph) {
    const length = [...data.glyph].length
    const size = length <= 2 ? 170 : length <= 6 ? 110 : 56
    ctx.font = font(600, size)
    const lines = wrap(ctx, data.glyph, W - PAD * 2 - 80, 3)
    const boxH = lines.length * size * 1.25 + (data.glyphSub ? 70 : 0) + 70
    y += 40
    roundRect(ctx, PAD, y, W - PAD * 2, boxH, 32, C.surface)
    ctx.textAlign = 'center'
    ctx.font = font(600, size)
    ctx.fillStyle = C.fg
    let ly = y + 35
    for (const line of lines) {
      ly += size * 1.15
      ctx.fillText(line, W / 2, ly)
    }
    if (data.glyphSub) {
      ctx.font = font(400, 34)
      ctx.fillStyle = C.muted
      const plain = unmark(data.glyphSub)
      const fits = wrap(ctx, plain, W - PAD * 2 - 80, 1)[0] === plain
      if (fits && plain !== data.glyphSub) {
        // The translation with its 형광펜, drawn piece by piece from the centred start.
        ctx.textAlign = 'left'
        let x = W / 2 - ctx.measureText(plain).width / 2
        for (const p of markPieces(data.glyphSub)) {
          const w = ctx.measureText(p.text).width
          if (p.mark) {
            ctx.fillStyle = C.accent
            ctx.globalAlpha = 0.4
            ctx.fillRect(x - 2, ly + 62 - 12, w + 4, 18)
            ctx.globalAlpha = 1
          }
          ctx.fillStyle = p.mark ? C.fg : C.muted
          ctx.fillText(p.text, x, ly + 62)
          x += w
        }
        ctx.textAlign = 'center'
      } else {
        ctx.fillText(wrap(ctx, plain, W - PAD * 2 - 80, 1)[0] ?? '', W / 2, ly + 62)
      }
    }
    ctx.textAlign = 'left'
    ctx.fillStyle = C.fg
    y += boxH
  }

  y += 36
  const rowH = Math.min(100, (H - PAD - 120 - y) / data.choices.length - 16)
  data.choices.forEach((choice, i) => {
    roundRect(ctx, PAD, y, W - PAD * 2, rowH, 24, C.surface2)
    ctx.font = font(600, 32)
    ctx.fillStyle = C.muted
    ctx.fillText(String(i + 1), PAD + 36, y + rowH / 2 + 11)
    ctx.font = font(400, 38)
    ctx.fillStyle = C.fg
    ctx.fillText(wrap(ctx, choice, W - PAD * 2 - 140, 1)[0] ?? '', PAD + 92, y + rowH / 2 + 13)
    y += rowH + 16
  })

  ctx.font = font(600, 32)
  ctx.fillStyle = C.fg
  ctx.fillText('정답은 여기서', PAD, H - PAD - 44)
  ctx.font = font(400, 30)
  ctx.fillStyle = C.muted
  ctx.fillText(WEB_URL.replace(/^https:\/\//, '').replace(/\/$/, ''), PAD, H - PAD)
  return canvas
}

export async function shareQuestion(data: QuestionCardData) {
  const canvas = await drawQuestionCard(data)
  const text = `상식한입 문제! "${data.prompt}" 맞혀 봐 → ${data.link}`
  await shareImage(canvas, text, '문제', '문제 공유')
}
