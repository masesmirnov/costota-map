import { esc, inline } from './sheet.js'

export function mountUsm(root, data, open) {
  const { activities, scenarios } = data.usm
  const stories = new Map(data.stories.items.map((s) => [s.id, s]))
  const next = new Map(data.stories.next.map((n) => [n.ID, n]))
  const card = (id) => {
    const s = stories.get(id)
    return `<button type="button" class="story" data-us="${id}"><span class="step"></span><span class="s-id">${id}<em>${esc(s.Приоритет)}</em></span><span class="s-title">${esc(s.title)}</span></button>`
  }
  const nextCard = (id) =>
    `<button type="button" class="story next" data-next="${id}"><span class="s-id">${id}</span><span class="s-title">${inline(next.get(id).История)}</span></button>`

  let grid = ''
  activities.forEach((a, i) => (grid += `<div class="act" style="--i:${i}"><h4>${esc(a.name)}</h4><p>${esc(a.steps)}</p></div>`))
  activities.forEach((a, i) => (grid += `<div class="stack mvp" style="--i:${i}">${a.mvp.map(card).join('')}</div>`))
  grid += `<div class="rule"><span>линия MVP</span></div>`
  activities.forEach((a, i) => (grid += `<div class="stack next" style="--i:${i}">${a.next.map(nextCard).join('')}</div>`))
  grid += `<div class="rule out"><span>вне scope</span></div>`
  activities.forEach((a, i) => (grid += `<div class="stack outs" style="--i:${i}">${a.out.map((o) => `<div class="story out">${esc(o)}</div>`).join('')}</div>`))

  const options = [`<label><input type="radio" name="scenario" value="" checked><span>Все истории</span></label>`]
    .concat(scenarios.map((s) => `<label><input type="radio" name="scenario" value="${s.id}"><span>${esc(s.id)}</span></label>`))
    .join('')

  root.innerHTML =
    `<div class="usm-tools"><div class="tabs" role="radiogroup" aria-label="Сквозной сценарий">${options}</div></div>` +
    `<div class="scenario" id="scenario" hidden></div>` +
    `<div class="usm" id="usm" style="--cols:${activities.length}">${grid}<svg class="paths" aria-hidden="true"></svg></div>`

  const usm = root.querySelector('#usm')
  const svg = usm.querySelector('.paths')
  const info = root.querySelector('#scenario')
  let active = null

  function draw(animate) {
    svg.innerHTML = ''
    if (!active || getComputedStyle(svg).display === 'none') return
    const box = usm.getBoundingClientRect()
    const points = active.path.map((id) => {
      const r = usm.querySelector(`[data-us="${id}"]`).getBoundingClientRect()
      return { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height }
    })
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`)
    const accent = getComputedStyle(usm).getPropertyValue('--accent').trim()
    let html = `<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1 9 5 1 9z" fill="${accent}"/></marker></defs>`
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1]
      const forward = b.x > a.x + 4
      const back = b.x < a.x - 4
      let d
      if (forward || back) {
        const sx = forward ? a.x + a.w : a.x
        const ex = forward ? b.x - 3 : b.x + b.w + 3
        const sy = a.y + a.h / 2, ey = b.y + b.h / 2
        const k = (Math.max(0, Math.min(Math.abs(ey - sy), Math.abs(ex - sx) - 12)) / 2) * (forward ? 1 : -1)
        const mx = (sx + ex) / 2
        d = `M${sx} ${sy}H${mx - k}L${mx + k} ${ey}H${ex}`
      } else {
        const x = a.x + a.w - 14
        d = `M${x} ${a.y + a.h} L${x} ${b.y - 3}`
      }
      html += `<path d="${d}" marker-end="url(#arrow)"${animate ? ` class="draw" style="animation-delay:${i * 0.18}s"` : ''}/>`
    }
    svg.innerHTML = html
    if (animate) for (const path of svg.querySelectorAll('.draw')) path.style.setProperty('--len', Math.ceil(path.getTotalLength()) + 1)
  }

  function select(id, quiet) {
    active = scenarios.find((s) => s.id === id) || null
    root.querySelector(`input[name="scenario"][value="${active ? active.id : ''}"]`).checked = true
    usm.classList.toggle('focus', !!active)
    for (const el of usm.querySelectorAll('.story')) {
      el.classList.remove('on')
      const step = el.querySelector('.step')
      if (step) step.textContent = ''
    }
    if (active) {
      active.path.forEach((us, i) => {
        const el = usm.querySelector(`[data-us="${us}"]`)
        el.classList.add('on')
        el.querySelector('.step').textContent = el.querySelector('.step').textContent ? el.querySelector('.step').textContent + ', ' + (i + 1) : i + 1
      })
      info.innerHTML = `<b>${esc(active.id)}. ${esc(active.title)}</b><span>Кроме CRUD: ${inline(active.logic)}</span>`
    }
    info.hidden = !active
    draw(!quiet)
  }

  root.querySelectorAll('input[name="scenario"]').forEach((input) => input.addEventListener('change', () => select(input.value)))
  usm.addEventListener('click', (event) => {
    const us = event.target.closest('[data-us]')?.dataset.us
    const n = event.target.closest('[data-next]')?.dataset.next
    if (us) open.story(us)
    if (n) open.next(n)
  })
  new ResizeObserver(() => draw(false)).observe(usm)
  return { select }
}
