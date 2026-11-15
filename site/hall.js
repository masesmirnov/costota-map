import * as k from 'iso-kit'
import { esc } from './sheet.js'
import { anchor } from './util.js'

const U = 4.445
const W = 60
const D = 100
const PLINTH = 8
const GAP = 2.5
const CAP = 3
const SLOT = 2
const X0 = -60
const X1 = 345
const Y0 = -30
const Y1 = 150
const ZB = -34
const VW = 1120
const PAD = 6

const day = (iso) => new Date(iso + 'T00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
const rect = (cls, x, y, w, h, extra = '') => `<rect class="${cls}" x="${+x.toFixed(2)}" y="${+y.toFixed(2)}" width="${+w.toFixed(2)}" height="${+h.toFixed(2)}"${extra}/>`
const dot = (cls, x, y, r, extra = '') => `<circle class="${cls}" cx="${+x.toFixed(2)}" cy="${+y.toFixed(2)}" r="${r}"${extra}/>`
const top = (stage) => PLINTH + GAP + stage.weight * U + GAP

function fit(stages) {
  const points = [...k.boxCorners({ x: X0, y: Y0, w: X1 - X0, d: Y1 - Y0 }, ZB, 0)]
  stages.forEach((s, i) => points.push(...k.boxCorners({ x: i * W, y: 0, w: W, d: D }, 0, top(s) + CAP + 2)))
  const unit = { origin: [0, 0], scale: 1, azimuth: 62, elevation: 26 }
  const flat = points.map((p) => k.iso(p, unit))
  const xs = flat.map((p) => p[0])
  const ys = flat.map((p) => p[1])
  const scale = (VW - PAD * 2) / (Math.max(...xs) - Math.min(...xs))
  const height = Math.ceil((Math.max(...ys) - Math.min(...ys)) * scale + PAD * 2)
  return { P: { ...unit, scale, origin: [PAD - Math.min(...xs) * scale, PAD - Math.min(...ys) * scale] }, height }
}

function server(vt, h, on) {
  let out = rect('f-sv', 4, vt + 0.15, 52, h - 0.3)
  out += rect('f-ear', 4, vt + 0.15, 3.2, h - 0.3) + rect('f-ear', 52.8, vt + 0.15, 3.2, h - 0.3)
  for (const cy of [vt + U / 2, vt + h - U / 2]) out += dot('f-screw', 5.6, cy, 0.55) + dot('f-screw', 54.4, cy, 0.55)
  if (!on) {
    out = out.replace(/f-sv|f-ear/g, 'f-bk')
    for (const ry of [vt + 2.4, vt + 4.1, vt + 5.8]) for (let i = 0; i < 6; i++) out += rect('f-vent', 10.5 + i * 6.6, ry, 5.2, 0.7)
    return out
  }
  for (let i = 0; i < 8; i++) {
    const bx = 9 + i * 4
    out += rect('f-bay', bx, vt + 1.2, 3.5, h - 2.4)
    out += dot('f-act', bx + 2.75, vt + h - 1.85, 0.32)
  }
  out += dot('f-led', 48.6, vt + 2.3, 0.6) + dot('f-act', 46.6, vt + 2.3, 0.42)
  out += rect('f-bay', 43.6, vt + h - 3, 7.4, 1.2)
  return out
}

function front(stage, x, P, seed) {
  const zt = top(stage)
  const uh = stage.weight * U
  const face = k.sideMatrix([x, D], zt, P, 'left')
  const open = uh - stage.items.length * SLOT * U
  let rear = ''
  if (open > 0.5) {
    const v0 = GAP - 0.4
    const h = open + 0.4
    const zf = zt - GAP - open
    const hole = [
      [x + 2.2, zt - v0],
      [x + 57.8, zt - v0],
      [x + 57.8, zf],
      [x + 2.2, zf],
    ].map(([wx, wz]) => k.iso([wx, D, wz], P))
    const shelf = [
      [x + 2.2, D],
      [x + 57.8, D],
      [x + 57.8, 12],
      [x + 2.2, 12],
    ].map(([wx, wy]) => k.iso([wx, wy, zf], P))
    let posts = ''
    for (const px of [3, 53.4]) posts += rect('f-post', px, v0, 3.6, h) + rect('f-holes', px + 0.9, GAP, 1.8, open)
    rear =
      `<clipPath id="void-${seed}"><path d="${k.pathOf(hole, true)}"/></clipPath><g clip-path="url(#void-${seed})">` +
      `<g transform="${k.sideMatrix([x, 12], zt, P, 'left')}">${rect('f-mesh', 2.2, v0, 55.6, h)}</g>` +
      `<g transform="${k.sideMatrix([x + 2.2, D], zt, P, 'right')}">${rect('f-wall', 0, v0, D - 12, h)}</g>` +
      `<path class="f-shelf" d="${k.pathOf(shelf, true)}"/>` +
      `<g transform="${k.sideMatrix([x, 26], zt, P, 'left')}">${posts}</g></g>`
  }
  let out = rect('f-post', 3, GAP - 0.4, 3.6, uh + 0.8) + rect('f-post', 53.4, GAP - 0.4, 3.6, uh + 0.8)
  out += rect('f-holes', 3.9, GAP, 1.8, uh) + rect('f-holes', 54.3, GAP, 1.8, uh)
  stage.items.forEach((item, j) => {
    const vb = GAP + uh - j * SLOT * U
    out += server(vb - SLOT * U, SLOT * U, item.done)
  })
  let vents = ''
  for (let i = 0; i < 14; i++) vents += rect('f-slot', 9 + i * 3.1, 2.4, 1.5, 3.2)
  return (
    `<g transform="${face}">${rect('f-void', 2.2, GAP - 0.4, 55.6, uh + 0.8)}</g>${rear}<g transform="${face}">${out}</g>` +
    `<g transform="${k.sideMatrix([x + 1.2, D - 1.2], PLINTH, P, 'left')}">${vents}</g>`
  )
}

function roof(x, zt, P) {
  const z = zt + CAP
  let out = `<path class="f-slot" d="${k.planOutline({ x: x + 18, y: 7, w: 24, d: 7, r: 1.2 }, z, P, 3)}"/>`
  for (let i = 1; i < 12; i++) out += `<path class="f-brush" d="${k.lineOnTop([x + 18 + i * 2, 7.6], [x + 18 + i * 2, 13.4], z, P)}"/>`
  out += k.dotsSvg(k.dotGrid(x + 14, 30, 9, 11, 4, z, P), { size: 0.55 })
  const eyes = [
    [x + 5, 5],
    [x + W - 5, 5],
    [x + 5, D - 5],
    [x + W - 5, D - 5],
  ].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))
  for (const [cx, cy] of eyes) out += k.solidSvg(k.cylinder(cx, cy, 1.5, z, 1.6, P, 16)) + `<path class="f-slot" d="${k.ring(cx, cy, 0.7, z + 1.6, P, 12)}"/>`
  return out
}

function side(x, zt, P) {
  return (
    k.lineSvg(k.segment([x, D / 2, PLINTH], [x, D / 2, zt], P), { tone: 'faint' }) +
    `<g transform="${k.sideMatrix([x, D], zt, P, 'right')}">${rect('f-slot', 7, 8, 2.2, 6)}${dot('f-screw', 8.1, 10, 0.45)}</g>`
  )
}

function rack(stage, i, P, last) {
  const x = i * W
  const zt = top(stage)
  const done = stage.items.filter((t) => t.done).length
  const label = `${stage.id}: сдано ${done} из ${stage.items.length}`
  return (
    `<a class="rk" href="#${anchor(stage)}" data-key="${anchor(stage)}" aria-label="${esc(label)}">` +
    `<g class="plinth">${k.solidSvg(k.slabOf({ x: x + 1.2, y: 1.2, w: W - 2.4, d: D - 2.4, r: 0 }, 0, PLINTH, P, 1))}</g>` +
    k.solidSvg(k.slabOf({ x, y: 0, w: W, d: D, r: 0 }, PLINTH, zt - PLINTH, P, 1)) +
    front(stage, x, P, i * 5) +
    (last ? side(x + W, zt, P) : '') +
    `<g class="cap">${k.solidSvg(k.slabOf({ x: x + 0.5, y: 0.5, w: W - 1, d: D - 1, r: 0.6 }, zt, CAP, P, 2, 0.6))}</g>` +
    roof(x, zt, P) +
    `</a>`
  )
}

function floor(stages, P) {
  const plan = { x: X0, y: Y0, w: X1 - X0, d: Y1 - Y0, r: 0 }
  let out = `<g class="g-base">${k.solidSvg(k.slabOf(plan, ZB, 6, P, 1))}</g>`
  out += `<g class="g-tray">${k.solidSvg(k.slabOf({ x: X0, y: 124, w: X1 - X0, d: 18, r: 0 }, -25, 3.5, P, 1))}</g>`
  const feet = []
  for (const y of [Y1 - 4, 100]) for (const x of [X0 + 4, 0, 60, 120, 180, 240, 300, X1 - 4]) feet.push([x, y])
  for (const y of [40, -16]) feet.push([X1 - 4, y])
  feet.sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))
  out += `<g class="g-ped">${feet
    .map(
      ([x, y]) =>
        k.solidSvg(k.slabOf({ x: x - 2.5, y: y - 2.5, w: 5, d: 5, r: 0 }, -28, 0.8, P, 1)) +
        k.solidSvg(k.cylinder(x, y, 1.1, -27.2, 23.4, P, 14)) +
        k.solidSvg(k.slabOf({ x: x - 3, y: y - 3, w: 6, d: 6, r: 0 }, -3.8, 0.8, P, 1)),
    )
    .join('')}</g>`
  let seams = ''
  for (let x = 0; x <= 300; x += 60) seams += k.lineOnTop([x, Y0], [x, Y1], 0, P) + k.segment([x, Y1, -3], [x, Y1, 0], P)
  for (const y of [40, 100]) seams += k.lineOnTop([X0, y], [X1, y], 0, P) + k.segment([X1, y, -3], [X1, y, 0], P)
  const tiles = stages
    .map((s, i) => `<path class="tile" data-key="${anchor(s)}" d="${k.planOutline({ x: i * W, y: D, w: W, d: 60, r: 0 }, 0, P, 1)}"/>`)
    .join('')
  const holes = stages.map((_, i) => k.dotsSvg(k.dotGrid(i * W + 6, D + 6, 10, 10, 48 / 9, 0, P), { size: 0.8 })).join('')
  out += `<g class="g-floor">${k.solidSvg(k.slabOf(plan, -3, 3, P, 1))}${tiles}<path class="seam" d="${seams}"/>${holes}</g>`
  return out
}

export function createHall(data) {
  const stages = data.stages
  const { P, height } = fit(stages)
  const svg =
    `<svg viewBox="0 0 ${VW} ${height}" role="group" aria-label="Машинный зал: по стойке на каждую контрольную точку">` +
    `<defs><pattern id="rk-holes" patternUnits="userSpaceOnUse" x="0" y="${GAP}" width="1.8" height="${U / 3}"><rect x="0.4" y="0.28" width="1" height="0.9" fill="var(--rk-hole)"/></pattern><pattern id="rk-mesh" patternUnits="userSpaceOnUse" width="2.4" height="2.4"><circle cx="1.2" cy="1.2" r="0.62" style="fill:var(--rk-mesh)"/></pattern></defs>` +
    floor(stages, P) +
    `<path class="iso-halo" d="${k.haloOf({ x: -3, y: -3, w: W * stages.length + 6, d: D + 6, r: 4 }, 0, 0, P)}"/>` +
    stages.map((s, i) => rack(s, i, P, i === stages.length - 1)).join('') +
    `</svg>`
  const labels = stages
    .map((s, i) => {
      const [x] = k.iso([i * W + W / 2, Y1, ZB], P)
      return `<li style="--x:${((x / VW) * 100).toFixed(2)}%"><a href="#${anchor(s)}" data-key="${anchor(s)}">${esc(s.id)}</a></li>`
    })
    .join('')
  const el = document.createElement('div')
  el.className = 'hall'
  el.innerHTML =
    `<div class="hall-fig">${svg}</div><ol class="hall-labels">${labels}</ol>` +
    `<div class="hall-read"><output aria-live="polite"></output><p>Чем больше КТ весит в оценке, тем выше её стойка: один юнит это один процент. Сервер с индикаторами уже сдан, заглушка ещё нет.</p></div>`
  const out = el.querySelector('output')
  const byKey = new Map(stages.map((s) => [anchor(s), s]))
  let focus = null

  const say = (key) => {
    const s = byKey.get(key)
    if (!s) return
    const done = s.items.filter((t) => t.done).length
    out.textContent = `${s.id}${s.date ? ', ' + day(s.date) : ''}: ${s.weight}% оценки, сдано ${done} из ${s.items.length}`
  }
  const mark = (cls, key) => {
    for (const node of el.querySelectorAll('[data-key]')) node.classList.toggle(cls, node.dataset.key === key)
  }
  const hot = (key) => {
    mark('hot', key)
    say(key || focus)
  }
  el.addEventListener('pointerover', (event) => hot(event.target.closest('[data-key]')?.dataset.key || null))
  el.addEventListener('pointerleave', () => hot(null))
  el.addEventListener('focusin', (event) => hot(event.target.closest('[data-key]')?.dataset.key || null))
  el.addEventListener('focusout', () => hot(null))

  return {
    el,
    focus(key) {
      focus = key
      mark('on', key)
      for (const a of el.querySelectorAll('.hall-labels a')) {
        if (a.dataset.key === key) a.setAttribute('aria-current', 'page')
        else a.removeAttribute('aria-current')
      }
      hot(null)
    },
  }
}
