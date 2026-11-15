import { closeSheet, esc, inline, openSheet, slug } from './sheet.js'
import { load } from './docs.js'
import { createHall } from './hall.js'
import { mountKt1, renderKt1 } from './kt1.js'
import { gh, setRepo } from './stage.js'
import { anchor, icon, ids, name } from './util.js'

const data = await load()
setRepo(data.repository)

const storyById = new Map(data.stories.items.map((s) => [s.id, s]))
const nfrById = new Map(data.nfr.items.map((n) => [n.ID, n]))
const riskById = new Map(data.brief.risks.map((r) => [r.id, r]))
const nextById = new Map(data.stories.next.map((n) => [n.ID, n]))
const brById = new Map(data.brief.requirements.map((r) => [r.ID, r]))
const testById = new Map(data.later.tests.map((t) => [t.ID, t]))
const acStory = new Map(data.stories.items.flatMap((s) => s.criteria.map((c) => [c.id, s.id])))
const home = 'kt-1'
const pages = new Map()
let shown = null

function header() {
  document.getElementById('brand-title').textContent = data.title
  const repo = document.getElementById('repo-link')
  repo.href = 'https://github.com/' + data.repository
  repo.target = '_blank'
  repo.rel = 'noopener'
  document.getElementById('bar-nav').innerHTML = data.stages
    .map((s) => (anchor(s) === 'kt-1' ? `<a href="#kt-1" data-page="kt-1" data-tip="${esc(s.title)}">${esc(s.id)}</a>` : `<a aria-disabled="true" data-tip="${esc(s.title)}">${esc(s.id)}${icon('i-lock')}</a>`))
    .join('')
  const theme = document.getElementById('theme-btn')
  const paint = () => {
    theme.innerHTML = icon(document.documentElement.dataset.theme === 'dark' ? 'i-sun' : 'i-moon')
  }
  theme.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('theme', next)
    } catch {}
    paint()
  })
  paint()
  const bar = document.querySelector('.bar')
  const onScroll = () => bar.classList.toggle('scrolled', scrollY > 8)
  addEventListener('scroll', onScroll, { passive: true })
  onScroll()
}

const hall = createHall(data)
for (const a of hall.el.querySelectorAll('a[data-key]:not([data-key="kt-1"])')) {
  a.removeAttribute('href')
  if (a.closest('.hall-labels')) a.insertAdjacentHTML('beforeend', icon('i-lock'))
}

function render() {
  const root = document.getElementById('pages')
  const stage = data.stages.find((s) => anchor(s) === 'kt-1')
  root.innerHTML = `<div class="page" data-page="kt-1" hidden>${renderKt1(data, stage)}</div>`
  const el = root.querySelector('.page')
  pages.set('kt-1', el)
  mountKt1(el, data, open)
}

function footer() {
  const course = data.intro[0].split(/(?<=\.)\s+/).find((s) => s.includes('НИС')) || ''
  document.getElementById('foot').innerHTML = `<span>${inline(course)}</span><a class="linkish" href="${esc(gh('README.md', 'документы'))}" target="_blank" rel="noopener">Все документы</a>`
}

function tooltip() {
  const box = document.createElement('div')
  box.className = 'tipbox'
  box.hidden = true
  document.body.append(box)
  let target = null
  const hide = () => {
    target = null
    box.hidden = true
  }
  const show = (el) => {
    if (el === target) return
    target = el
    box.textContent = el.dataset.tip
    box.hidden = false
    const r = el.getBoundingClientRect()
    const w = box.offsetWidth
    const h = box.offsetHeight
    const x = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2))
    const y = r.top - h - 8 < 64 ? r.bottom + 8 : r.top - h - 8
    box.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`
  }
  document.addEventListener('pointerover', (event) => {
    const el = event.target.closest?.('[data-tip]')
    if (el) show(el)
    else hide()
  })
  document.addEventListener('focusin', (event) => {
    const el = event.target.closest?.('[data-tip]')
    if (el && el.matches(':focus-visible')) show(el)
  })
  document.addEventListener('focusout', hide)
  addEventListener('scroll', hide, { passive: true })
  document.addEventListener('pointerdown', hide)
}

function reveal() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
  document.documentElement.classList.add('motion')
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('in')
        io.unobserve(entry.target)
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  )
  for (const el of document.querySelectorAll('.rv')) io.observe(el)
}

const sec = (title, html) => (html ? `<div class="s-sec"><h3>${title}</h3><p>${html}</p></div>` : '')
const docButton = (path, hash, text = 'Открыть в документе') =>
  `<a class="s-open" href="${esc(gh(path, hash))}" target="_blank" rel="noopener">${text}${icon('i-arrow')}</a>`
const P = ['низкая', 'средняя', 'высокая']
const I = ['низкое', 'среднее', 'высокое']

const open = {
  story(id) {
    const s = storyById.get(id)
    if (!s) return
    const nfr = (s.NFR || '').match(/NFR-\d+/g) || []
    const brs = (s.BR || '').match(/BR-\d+/g) || []
    const meta = [
      ['Актор', esc(s.Актор)],
      ['Приоритет', esc(s.Приоритет)],
      ['BR', brs.map((b) => `<button type="button" class="linkish" data-br="${b}">${b}</button>`).join(', ')],
      ['NFR', nfr.map((n) => `<button type="button" class="linkish" data-nfr="${n}">${n}</button>`).join(', ')],
      ['Тесты', esc(s.Тесты)],
      ['Владелец', esc(s.Владелец)],
    ].filter(([, v]) => v)
    const criteria = s.criteria
      .map((c) => `<div class="ac"><span class="a-id">${c.id}</span><div class="gwt"><b>Given</b><span>${inline(c.given)}</span></div><div class="gwt"><b>When</b><span>${inline(c.when)}</span></div><div class="gwt"><b>Then</b><span>${inline(c.then)}</span></div></div>`)
      .join('')
    openSheet(
      `<span class="id">${id}</span>`,
      `<h2>${esc(s.title)}</h2><dl class="s-meta">${meta.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` +
        `<p class="s-story">${inline(s.story)}</p>${s.notes.map((n) => `<p class="note">${inline(n)}</p>`).join('')}` +
        sec('Основной путь', s.path && inline(s.path)) +
        sec('Ошибки', s.errors && inline(s.errors)) +
        `<div class="s-sec"><h3>Критерии приёмки</h3><div class="acs">${criteria}</div></div>` +
        docButton('docs/requirements/stories.md', slug(`${id}. ${s.title}`)),
      id,
    )
  },
  nfr(id) {
    const n = nfrById.get(id)
    if (!n) return
    const related = data.stories.items.filter((s) => (s.NFR || '').includes(id))
    openSheet(
      `<span class="id">${id}</span>`,
      `<h2>${inline(n.Требование)}</h2>` +
        sec('Метрика и порог', inline(n['Метрика и порог'])) +
        sec('Условия измерения', inline(n['Условия измерения'])) +
        sec('Как проверю', inline(n['Как проверю'])) +
        sec('Факт', n.Факт && inline(n.Факт)) +
        (related.length ? `<div class="s-sec"><h3>Истории</h3><p>${related.map((s) => `<button type="button" class="linkish" data-us="${s.id}">${s.id}</button> ${esc(s.title)}`).join('<br>')}</p></div>` : '') +
        docButton('docs/requirements/nfr.md'),
      id,
    )
  },
  risk(id) {
    const r = riskById.get(id)
    if (!r) return
    openSheet(
      `<span class="id">${id}</span>`,
      `<h2>${inline(r.text)}</h2><dl class="s-meta"><div><dt>Вероятность</dt><dd>${P[r.p]}</dd></div><div><dt>Влияние</dt><dd>${I[r.i]}</dd></div><div><dt>Владелец</dt><dd>${esc(r.owner)}</dd></div></dl>` +
        sec('Мера', inline(r.measure)) +
        docButton('docs/product/brief.md', 'риски'),
      id,
    )
  },
  br(id) {
    const r = brById.get(id)
    if (!r) return
    const us = data.trace[id] || []
    openSheet(
      `<span class="id">${id}</span>`,
      `<h2>${inline(r.Требование)}</h2><dl class="s-meta"><div><dt>Цель</dt><dd>${inline(r.Цель)}</dd></div></dl>` +
        sec('Метрика', inline(r.Метрика)) +
        sec('Факт или как проверю', inline(r['Факт или как проверю'])) +
        (us.length ? `<div class="s-sec"><h3>Истории</h3><p>${us.map((u) => `<button type="button" class="linkish" data-us="${u}">${u}</button> ${esc(storyById.get(u)?.title)}`).join('<br>')}</p></div>` : '') +
        docButton('docs/product/brief.md', 'бизнес-требования'),
      id,
    )
  },
  next(id) {
    const n = nextById.get(id)
    if (!n) return
    openSheet(
      `<span class="id">${id}</span>`,
      `<h2>${inline(n.История)}</h2>` + sec('Почему', inline(n.Почему)) + sec('Бизнес-требование', esc(n.BR)) + docButton('docs/requirements/stories.md', 'следующий-срез'),
      id,
    )
  },
  test(id) {
    const t = testById.get(id)
    if (!t) return
    const refs = ids(t['Критерии и НФТ'])
    const us = [...new Set(refs.map((r) => acStory.get(r)).filter(Boolean))]
    const nfr = refs.filter((r) => r.startsWith('NFR-'))
    const meta = [
      ['Уровень', esc(t.Уровень + (data.later.levels[t.Уровень] ? ': ' + data.later.levels[t.Уровень] : ''))],
      ['Критерии', esc(refs.filter((r) => r.startsWith('AC-')).join(', '))],
      ['Истории', us.map((u) => `<button type="button" class="linkish" data-us="${u}">${u}</button>`).join(', ')],
      ['NFR', nfr.map((n) => `<button type="button" class="linkish" data-nfr="${n}">${n}</button>`).join(', ')],
      ['Статус', esc(t.Статус)],
    ].filter(([, v]) => v)
    openSheet(
      `<span class="id">${id}</span>`,
      `<h2>${inline(t['Что проверяет'])}</h2><dl class="s-meta">${meta.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` +
        docButton('docs/requirements/traceability.md', 'тесты'),
      id,
    )
  },
}

const SHEETS = [
  [/^US-\d+$/, open.story],
  [/^NFR-\d+$/, open.nfr],
  [/^R-\d+$/, open.risk],
  [/^BR-\d+$/, open.br],
  [/^N-\d+$/, open.next],
  [/^T-\d+$/, open.test],
]

document.addEventListener('click', (event) => {
  const el = event.target.closest('[data-us], [data-nfr], [data-risk], [data-br], [data-test]')
  if (!el || el.closest('#usm')) return
  if (el.dataset.us) open.story(el.dataset.us)
  else if (el.dataset.nfr) open.nfr(el.dataset.nfr)
  else if (el.dataset.risk) open.risk(el.dataset.risk)
  else if (el.dataset.br) open.br(el.dataset.br)
  else if (el.dataset.test) open.test(el.dataset.test)
})

function show(key) {
  if (!pages.has(key)) key = home
  if (key === shown) return
  shown = key
  for (const [k, el] of pages) el.hidden = k !== key
  pages.get(key).querySelector('.hall-slot').append(hall.el)
  hall.focus(key)
  for (const a of document.querySelectorAll('#bar-nav a')) {
    if (a.dataset.page === key) a.setAttribute('aria-current', 'page')
    else a.removeAttribute('aria-current')
  }
  const stage = data.stages.find((s) => anchor(s) === key)
  document.title = `${name(stage)}. ${data.title}`
  scrollTo({ top: 0, behavior: 'instant' })
}

function route() {
  const hash = decodeURIComponent(location.hash.slice(1))
  const sheet = SHEETS.find(([re]) => re.test(hash))
  if (sheet) {
    show('kt-1')
    history.replaceState(null, '', '#kt-1')
    sheet[1](hash)
  } else {
    closeSheet()
    show(hash)
  }
}

header()
render()
footer()
tooltip()
reveal()
route()
addEventListener('hashchange', route)
