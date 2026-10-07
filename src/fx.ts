// 게임 모드 visual effects on a single full-screen canvas: fireworks, burning flames,
// smoke and floating score text. Runs only while something is visible.

type Kind = 'spark' | 'flame' | 'smoke' | 'text'

interface Particle {
  kind: Kind
  x: number
  y: number
  vx: number
  vy: number
  /** Seconds lived / total seconds. */
  age: number
  life: number
  size: number
  color: string
  gravity: number
  drag: number
  text?: string
}

const MAX_PARTICLES = 700
const FIREWORK_COLORS = ['#c6f432', '#ffd84a', '#ffffff', '#ff7ab6', '#5ce1ff', '#ff9f43']

let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let particles: Particle[] = []
let flameLevel = 0
let raf = 0
let last = 0
let dpr = 1
const sprites = new Map<string, HTMLCanvasElement>()

function ensureCanvas() {
  if (canvas) return
  canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:60'
  document.body.appendChild(canvas)
  ctx = canvas.getContext('2d')
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas!.width = window.innerWidth * dpr
    canvas!.height = window.innerHeight * dpr
  }
  resize()
  window.addEventListener('resize', resize)
}

/** Soft glowing dot, pre-rendered once per color (gradients per frame are too slow on phones). */
function glow(color: string) {
  let s = sprites.get(color)
  if (!s) {
    s = document.createElement('canvas')
    s.width = s.height = 64
    const g = s.getContext('2d')!
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, color)
    grad.addColorStop(0.35, color)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 64, 64)
    sprites.set(color, s)
  }
  return s
}

function add(p: Omit<Particle, 'age'>) {
  if (particles.length >= MAX_PARTICLES) particles.shift()
  particles.push({ ...p, age: 0 })
}

function start() {
  ensureCanvas()
  if (!raf) {
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }
}

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]

function spawnFlames(dt: number) {
  if (!flameLevel) return
  const w = window.innerWidth
  const h = window.innerHeight
  const rate = [0, 40, 90, 160][flameLevel] * dt
  for (let i = 0; i < rate; i++) {
    // Mostly along the bottom edge; from level 2 the side edges catch fire too.
    const side = flameLevel >= 2 && Math.random() < 0.35
    const x = side ? (Math.random() < 0.5 ? rand(-10, 20) : rand(w - 20, w + 10)) : rand(-20, w + 20)
    const y = side ? rand(h * (flameLevel === 3 ? 0.35 : 0.6), h) : h + rand(0, 20)
    add({
      kind: 'flame',
      x,
      y,
      vx: side ? (x < w / 2 ? rand(10, 40) : rand(-40, -10)) : rand(-15, 15),
      vy: -rand(80, 160) * (0.8 + flameLevel * 0.25),
      life: rand(0.6, 1.1),
      size: rand(26, 54) * (0.8 + flameLevel * 0.2),
      color: '',
      gravity: 0,
      drag: 1,
    })
  }
}

function flameColor(t: number) {
  if (t < 0.25) return '#fff4b0'
  if (t < 0.5) return '#ffb02e'
  if (t < 0.75) return '#ff5a1f'
  return '#b3200e'
}

function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.05)
  last = now
  spawnFlames(dt)

  const c = ctx!
  c.setTransform(dpr, 0, 0, dpr, 0, 0)
  c.clearRect(0, 0, window.innerWidth, window.innerHeight)

  particles = particles.filter((p) => (p.age += dt / p.life) < 1)
  for (const p of particles) {
    p.vy += p.gravity * dt
    p.vx *= p.drag
    p.vy *= p.drag
    p.x += p.vx * dt
    p.y += p.vy * dt
    const fade = 1 - p.age

    switch (p.kind) {
      case 'flame': {
        c.globalCompositeOperation = 'lighter'
        c.globalAlpha = Math.min(1, fade * 1.4) * 0.55
        const size = p.size * (1 - p.age * 0.6)
        c.drawImage(glow(flameColor(p.age)), p.x - size / 2, p.y - size / 2, size, size)
        break
      }
      case 'spark': {
        c.globalCompositeOperation = 'lighter'
        c.globalAlpha = fade
        const size = p.size * (0.6 + fade * 0.6)
        c.drawImage(glow(p.color), p.x - size / 2, p.y - size / 2, size, size)
        break
      }
      case 'smoke': {
        c.globalCompositeOperation = 'source-over'
        c.globalAlpha = fade * 0.35
        const size = p.size * (1 + p.age * 1.5)
        c.drawImage(glow(p.color), p.x - size / 2, p.y - size / 2, size, size)
        break
      }
      case 'text': {
        c.globalCompositeOperation = 'source-over'
        c.globalAlpha = Math.min(1, fade * 2)
        const scale = p.age < 0.15 ? 0.6 + (p.age / 0.15) * 0.5 : 1.1 - p.age * 0.1
        c.font = `800 ${Math.round(p.size * scale)}px 'Pretendard Variable', Pretendard, sans-serif`
        c.textAlign = 'center'
        c.lineWidth = 4
        c.strokeStyle = 'rgba(0,0,0,0.55)'
        c.strokeText(p.text!, p.x, p.y)
        c.fillStyle = p.color
        c.fillText(p.text!, p.x, p.y)
        break
      }
    }
  }
  c.globalAlpha = 1
  c.globalCompositeOperation = 'source-over'

  if (particles.length || flameLevel) raf = requestAnimationFrame(frame)
  else {
    raf = 0
    c.clearRect(0, 0, window.innerWidth, window.innerHeight)
  }
}

/** Firework burst at a point. power 1-3 scales size and count. */
export function fireworks(x: number, y: number, power = 1) {
  start()
  const count = 36 + power * 24
  const colors = [pick(FIREWORK_COLORS), pick(FIREWORK_COLORS), '#ffffff']
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + rand(-0.1, 0.1)
    const speed = rand(140, 320) * (0.8 + power * 0.25)
    add({
      kind: 'spark',
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: rand(0.7, 1.2),
      size: rand(8, 14),
      color: pick(colors),
      gravity: 260,
      drag: 0.965,
    })
  }
}

/** Several bursts scattered over the screen, for milestones and results. */
export function celebrate(bursts = 4) {
  const w = window.innerWidth
  const h = window.innerHeight
  for (let i = 0; i < bursts; i++) {
    setTimeout(() => fireworks(rand(w * 0.15, w * 0.85), rand(h * 0.15, h * 0.5), 2), i * 220)
  }
}

/** Rising puffs along the bottom when the burning streak is broken. */
export function extinguish() {
  start()
  const w = window.innerWidth
  const h = window.innerHeight
  for (let i = 0; i < 30; i++) {
    add({
      kind: 'smoke',
      x: rand(0, w),
      y: h + rand(-10, 30),
      vx: rand(-20, 20),
      vy: -rand(60, 140),
      life: rand(0.9, 1.5),
      size: rand(40, 80),
      color: '#5a5a62',
      gravity: 0,
      drag: 0.99,
    })
  }
}

/** Floating text such as "+120" or "5 COMBO!". */
export function floatText(x: number, y: number, text: string, color = '#c6f432', size = 30) {
  start()
  add({ kind: 'text', x, y, vx: 0, vy: -70, life: 1.1, size, color, gravity: 0, drag: 1, text })
}

/** 0 = off, 1-3 = stronger burning around the screen edges. */
export function setFlame(level: number) {
  flameLevel = Math.max(0, Math.min(3, level))
  if (flameLevel) start()
}

export function clearFx() {
  flameLevel = 0
  particles = []
}

/** A quick red blink over the whole screen for a wrong answer ("뿌뿌-"). */
export function flashWrong() {
  const el = document.createElement("div")
  el.className = "fx-flash-wrong pointer-events-none fixed inset-0 z-[65]"
  el.addEventListener("animationend", () => el.remove())
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 1200)
}
