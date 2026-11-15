import * as k from 'iso-kit'

const W = 44
const D = 72
const H = 8.8
const EAR = 2.2
const VW = 640
const PAD = 6
const CAM = { azimuth: 62, elevation: 38 }
const UNIT = { origin: [0, 0], scale: 1, ...CAM }
const MOVES = { pull: [0, 11, 0], back: [0, -13, 0], lift: [0, 0, 8], card: [0, 0, 5] }
const FAN = [3.15, 3.2]

const rect = (cls, x, y, w, h) => `<rect class="${cls}" x="${+x.toFixed(2)}" y="${+y.toFixed(2)}" width="${+w.toFixed(2)}" height="${+h.toFixed(2)}"/>`
const dot = (cls, x, y, r) => `<circle class="${cls}" cx="${+x.toFixed(2)}" cy="${+y.toFixed(2)}" r="${r}"/>`

function fit() {
  const flat = k.boxCorners({ x: -EAR, y: 0, w: W + EAR * 2, d: D }, 0, H).map((p) => k.iso(p, UNIT))
  const xs = flat.map((p) => p[0])
  const ys = flat.map((p) => p[1])
  const scale = (VW - PAD * 2) / (Math.max(...xs) - Math.min(...xs))
  const height = Math.ceil((Math.max(...ys) - Math.min(...ys)) * scale + PAD * 2)
  return { P: { ...UNIT, scale, origin: [PAD - Math.min(...xs) * scale, PAD - Math.min(...ys) * scale] }, height }
}

function part(cls, x, y, w, d, z, h, extra, toy) {
  return { cls, x, y, w, d, z, h, extra, toy }
}

const slab = (x, y, w, d, z, h, P) => k.solidSvg(k.slabOf({ x, y, w, d, r: 0 }, z, h, P, 1))

function draw(p, P) {
  const body = slab(p.x, p.y, p.w, p.d, p.z, p.h, P) + (p.extra ? p.extra(P) : '')
  if (!p.toy) return `<g class="${p.cls}">${body}</g>`
  const bank = p.toy.bank === undefined ? '' : ` data-bank="${p.toy.bank}"`
  return `<g class="${p.cls} toy" data-act="${p.toy.act}"${bank} data-tip="${p.toy.tip}" tabindex="0" role="button" aria-label="${p.toy.tip}">${body}</g>`
}

const front = (p, P, inner) => `<g transform="${k.sideMatrix([p.x, p.y + p.d], p.z + p.h, P, 'left')}">${inner}</g>`

function blades() {
  const [cx, cy] = FAN
  const at = (r, a) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`
  let d = ''
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    d += `M${at(0.9, a - 0.3)}L${at(2.6, a - 0.05)}Q${at(2.75, a + 0.25)} ${at(2.5, a + 0.55)}L${at(0.9, a + 0.35)}Z`
  }
  return `<g class="blades"><path class="f-blade" d="${d}"/></g>`
}

function inside() {
  const list = []
  list.push(part('p-pcb', 14.6, 1, 0.4, 13, 0.75, 6.6))
  for (const x of [3, 15.2]) {
    list.push(part('p-card', x, 1, 11.4, 15, 4.2, 0.25, (P) => `<g class="p-alu">${slab(x + 3, 5, 4.5, 4.5, 4.45, 1.1, P)}</g>`, { act: 'card', tip: 'Карта PCIe' }))
  }
  for (const x of [30.6, 37]) {
    list.push(part('p-psu', x, 1, 6, 20, 0.7, 4, (P) => k.dotsSvg(k.dotGrid(x + 0.8, 2.4, 5, 16, 1.1, 4.7, P), { size: 0.45 }), { act: 'back', tip: 'Блок питания' }))
  }
  for (const x of [6.6, 26.4]) {
    list.push(part('p-chip', x + 1, 26.5, 7, 8, 0.75, 0.4))
    list.push(
      part(
        'p-alu',
        x,
        25,
        9,
        11,
        0.7,
        5.2,
        (P) => {
          let fins = ''
          for (let i = 1; i < 13; i++) fins += k.lineOnTop([x + i * 0.69, 25.4], [x + i * 0.69, 35.6], 5.9, P)
          return `<path class="fin" d="${fins}"/>`
        },
        { act: 'lift', tip: 'Радиатор процессора' },
      ),
    )
  }
  ;[2.2, 16.3, 22, 36.1].forEach((x0, bank) => {
    for (let i = 0; i < 4; i++) list.push(part('p-dimm', x0 + i * 0.9, 24, 0.5, 13, 0.7, 3.2, null, { act: 'pop', bank, tip: 'Память' }))
  })
  for (let i = 0; i < 6; i++) {
    const x = 2.6 + i * 6.5
    const face = (P) => front({ x, y: 44, d: 4.6, z: 0.7, h: 6.4 }, P, dot('f-hole', ...FAN, 2.85) + blades() + dot('f-hub', ...FAN, 1))
    list.push(part('p-fan', x, 44, 6.3, 4.6, 0.7, 6.4, face, { act: 'spin', tip: 'Вентилятор' }))
  }
  for (let i = 0; i < 12; i++) {
    const x = EAR + 0.1 + i * 3.3
    const face = (P) => front({ x, y: 58.4, d: 13.6, z: 0.9, h: 7 }, P, rect('f-grip', 0.5, 4.4, 2.1, 2) + dot('f-dark', 1.55, 0.9, 0.32))
    list.push(part('p-nv', x, 58.4, 3.1, 13.6, 0.9, 7, face, { act: 'pull', tip: 'NVMe-диск' }))
  }
  const depth = (p) => k.depthOf([p.x + p.w / 2, p.y + p.d / 2, p.z + p.h / 2], UNIT)
  return list.sort((a, b) => depth(a) - depth(b))
}

function shell() {
  const panel = (P) => front({ x: 0, y: 71.4, d: 0.6, z: 0.9, h: 7 }, P, dot('f-led', 1.1, 1.2, 0.35) + dot('f-dark', 1.1, 3, 0.55))
  const screws = (x) => (P) => front({ x, y: 71.4, d: 0.6, z: 0, h: H }, P, dot('f-dark', EAR / 2, 1.6, 0.45) + dot('f-dark', EAR / 2, H - 1.6, 0.45))
  return [
    part('p-case', W - 0.6, 0, 0.6, 71.4, 0.5, H - 0.5),
    part('p-case', 0, 71.4, W, 0.6, 0, 0.9),
    part('p-case', 0, 71.4, W, 0.6, 7.9, 0.9),
    part('p-case', 0, 71.4, EAR, 0.6, 0.9, 7, panel),
    part('p-case', W - EAR, 71.4, EAR, 0.6, 0.9, 7),
    part('p-case', -EAR, 71.4, EAR, 0.6, 0, H, screws(-EAR)),
    part('p-case', W, 71.4, EAR, 0.6, 0, H, screws(W)),
  ]
}

export function serverFigure() {
  const { P, height } = fit()
  const base = [
    part('p-case', 0, 0, W, D, 0, 0.5),
    part('p-case', 0, 0, 0.6, 71.4, 0.5, H - 0.5),
    part('p-case', 0.6, 0, W - 1.2, 0.6, 0.5, H - 0.5),
    part('p-pcb', 1.2, 1, W - 2.4, 56, 0.5, 0.25),
  ]
  return (
    `<svg viewBox="0 0 ${VW} ${height}" role="group" aria-label="Сервер со снятой крышкой: спереди двенадцать NVMe-дисков">` +
    `<path class="iso-halo" d="${k.haloOf({ x: -1, y: -1, w: W + 2, d: D + 2, r: 2 }, 0, 0, P)}"/>` +
    [...base, ...inside(), ...shell()].map((p) => draw(p, P)).join('') +
    `</svg>`
  )
}

export function mountServer(root) {
  const svg = root.querySelector('.part svg')
  if (!svg) return
  const { P } = fit()
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  const shift = (v) => {
    const [dx, dy] = k.axisVector(P, v)
    return `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`
  }

  const raise = (g) => {
    if (!g.home) {
      g.home = document.createComment('')
      g.before(g.home)
    }
    svg.append(g)
  }
  const settle = (g) => {
    if (!g.home || g.classList.contains('out')) return
    g.home.replaceWith(g)
    g.home = null
  }
  const toggle = (g) => {
    const out = g.classList.toggle('out')
    if (out) {
      if (g.dataset.act !== 'back') raise(g)
      g.getBoundingClientRect()
      g.style.transform = shift(MOVES[g.dataset.act])
    } else {
      g.style.transform = ''
      if (still) settle(g)
      else g.addEventListener('transitionend', () => settle(g), { once: true })
    }
  }

  const spins = new Map()
  let last = 0
  let running = false
  const step = (t) => {
    const dt = Math.min(0.05, (t - last) / 1000)
    last = t
    let busy = false
    for (const [el, s] of spins) {
      s.a = (s.a + s.v * dt) % 360
      s.v *= Math.pow(0.42, dt)
      if (s.v < 4) s.v = 0
      else busy = true
      el.setAttribute('transform', `rotate(${s.a.toFixed(1)} ${FAN[0]} ${FAN[1]})`)
    }
    running = busy
    if (busy) requestAnimationFrame(step)
  }
  const spin = (g) => {
    const el = g.querySelector('.blades')
    const s = spins.get(el) || { a: 0, v: 0 }
    s.v = Math.min(s.v + 1100, 2600)
    spins.set(el, s)
    if (still || running) return
    running = true
    last = performance.now()
    requestAnimationFrame(step)
  }

  const pop = (g) => {
    if (still) return
    svg.querySelectorAll(`[data-bank="${g.dataset.bank}"]`).forEach((el, i) =>
      el.animate([{ transform: 'none' }, { transform: shift([0, 0, 3.2]) }, { transform: 'none' }], { duration: 640, delay: i * 70, easing: 'cubic-bezier(.3, .7, .3, 1)' }),
    )
  }

  const act = (g) => {
    if (g.dataset.act === 'spin') spin(g)
    else if (g.dataset.act === 'pop') pop(g)
    else toggle(g)
  }
  svg.addEventListener('click', (event) => {
    const g = event.target.closest('.toy')
    if (g) act(g)
  })
  svg.addEventListener('keydown', (event) => {
    const g = event.target.closest('.toy')
    if (!g || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    act(g)
  })
}
