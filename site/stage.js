import { esc } from './sheet.js'
import { icon } from './util.js'

let base = ''

export const setRepo = (repo) => {
  base = `https://github.com/${repo}/blob/main/`
}

export const gh = (path, part) => base + path + (part ? '#' + part : '')

const file = (path) => path.split('/').slice(path.endsWith('/index.md') ? -2 : -1).join('/')

export const docLink = (path, part, text) =>
  `<a class="doc" href="${esc(gh(path, part))}" target="_blank" rel="noopener">${esc(text || file(path))}</a>`

export const device = (title, body, meta = '') =>
  `<article class="dev"><div class="dev-in"><header class="dev-head"><h3>${title}</h3>${meta ? `<div class="dev-meta">${meta}</div>` : ''}</header><div class="dev-body">${body}</div></div></article>`

export const blank = (title, meta = '') =>
  `<section class="blank" style="--span:2"><h2>${title}</h2>${meta ? `<span class="blank-meta">${meta}</span>` : ''}</section>`

export const rack = (units) =>
  `<section class="rack-sec"><div class="wrap"><div class="rack"><div class="rail" aria-hidden="true"></div><div class="units">${units}</div><div class="rail" aria-hidden="true"></div></div></div></section>`

export const tale = (text) => `<p class="tale">${text}</p>`

export const ending = (href, text) => `<section class="blank end"><a class="next-kt" href="${href}">${text}${icon('i-arrow')}</a></section>`

export const hours = (stage) => stage.tasks.reduce((s, t) => s + Number(t.Оценка || 0), 0)

export function mountRack(root) {
  const units = root.querySelector('.units')
  if (!units) return
  const measure = () => {
    const u = parseFloat(getComputedStyle(units).getPropertyValue('--u')) || 36
    for (const el of units.children) {
      const inner = el.querySelector('.dev-in')
      const span = inner ? Math.max(2, Math.ceil((inner.offsetHeight + 1) / u)) : 2
      el.style.setProperty('--span', span)
    }
  }
  const watch = new ResizeObserver(() => requestAnimationFrame(measure))
  for (const inner of units.querySelectorAll('.dev-in')) watch.observe(inner)
  measure()
}

export function bays(stage) {
  return `<div class="plate cage">${stage.items
    .map((x) => `<div class="sled${x.done ? ' in' : ''}"><i></i><span class="sled-name">${esc(x.label)}</span>${x.done && x.docs.length ? `<span class="sled-docs">${x.docs.map((d) => docLink(d)).join('')}</span>` : ''}</div>`)
    .join('')}</div>`
}

export function demo() {
  return (
    `<div class="demo" id="demo"><div class="demo-bar"><div class="crumbs" id="crumbs"></div><div class="demo-tools">` +
    `<div class="seg" role="radiogroup" aria-label="Размер плиток"><label><input type="radio" name="size" value="cost" checked><span>По стоимости</span></label><label><input type="radio" name="size" value="equal"><span>Равные</span></label></div>` +
    `<label class="switch"><input type="checkbox" id="rule" checked><span class="knob"></span><span>Правило простоя</span></label></div></div>` +
    `<div class="demo-stage" id="stage"><canvas id="map" aria-label="Карта затрат на сгенерированных данных"></canvas><div class="tip" id="tip" hidden></div><aside class="card" id="card" hidden></aside></div>` +
    `<div class="demo-foot"><div class="legend" id="legend"></div><p class="summary" id="summary"></p></div></div>`
  )
}
