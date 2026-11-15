import { mountServer, serverFigure } from './server.js'
import { mountUsm } from './usm.js'
import { esc, inline } from './sheet.js'
import { bays, blank, device, docLink, hours, mountRack, rack, tale } from './stage.js'
import { icon, plural } from './util.js'

const BRIEF = 'docs/product/brief.md'
const FACTS = [
  {
    ref: 'Ф-3',
    anchor: 'факты',
    text: 'У шести серверов <span class="nv">NVMe-диски</span> стоят <b>29–39%</b> цены сервера, а записано на них за всё время 4–46 МБ. Чтобы это увидеть, пришлось по каждому серверу свести счёт, NetBox, node_exporter и SMART.',
  },
  {
    ref: 'Ф-2',
    anchor: 'факты',
    text: 'На собственный юнит команды в COSTOTA записано <b>меньше трети</b> её реальных расходов, остальное числится за юнитами других команд.',
  },
  {
    ref: 'Г-2',
    anchor: 'гипотезы',
    text: 'Быстрые меры я оценил примерно в <b>8%</b> месячных затрат команды, но это пока только оценка.',
  },
]

const WHO = ['Инженер', 'Команда-владелец', 'DevOps', 'Руководитель и FinOps', 'ИИ-анализ']

function cover(data) {
  const lead = data.intro[0].split(/(?<=\.)\s+/).filter((s) => !s.includes('НИС')).join(' ')
  return `<section class="head"><div class="wrap"><h1 class="rv">${esc(data.title)}</h1><p class="lead rv">${inline(lead)}</p><div class="hall-slot"></div></div></section>`
}

function problem(brief) {
  const facts = FACTS.map((f) => `<p>${f.text} ${docLink(BRIEF, f.anchor, f.ref)}</p>`).join('')
  return `<p class="statement">${inline(brief.problem[0])}</p><div class="probe"><figure class="part">${serverFigure()}</figure><div class="facts">${facts}</div></div>`
}

function compare(brief) {
  const keys = brief.alternatives
    .map((a, i) => `<button type="button" class="key" data-alt="${i}" aria-pressed="false"><i></i><span>${inline(a.Альтернатива.replace(/\s*\(.*\)$/, ''))}</span></button>`)
    .join('')
  return `<div class="plate kvm"><div class="kvm-keys">${keys}</div><div class="kvm-screen" aria-live="polite"></div></div>`
}

function value(brief) {
  const rows = brief.value
    .map((v) => {
      const who = WHO.find((w) => v.startsWith(w))
      const text = who ? v.slice(who.length).trim() : v
      return `<li><button type="button" class="tap"><i class="port"></i><b>${who || ''}</b><span>${inline(text[0].toUpperCase() + text.slice(1))}</span></button></li>`
    })
    .join('')
  return `<div class="bus"><span class="bus-src">${icon('i-logo')}</span><ol>${rows}</ol><i class="packet"></i></div>`
}

const UNITS = [
  { re: /(\d+(?:,\d+)?)(?:–(\d+(?:,\d+)?))?\s*из 10/g, max: () => 10 },
  { re: /\$(\d+(?:,\d+)?)/g, max: (all) => Math.max(...all) * 1.3 },
  { re: /(\d+(?:,\d+)?)\s*%/g, max: () => 100 },
  { re: /(\d+(?:,\d+)?)(?:–(\d+(?:,\d+)?))?\s*(мин|с)(?![а-яё])/g, max: (all) => Math.max(...all) * 1.3, scale: (m) => (m[3] === 'мин' ? 60 : 1) },
]
const number = (text) => Number(text.replace(',', '.'))

export function measure(target, fact) {
  for (const unit of UNITS) {
    const part = target.split(';').find((p) => p.match(unit.re))
    if (!part) continue
    const k = (m) => unit.scale?.(m) || 1
    const head = [...part.matchAll(unit.re)][0]
    const goal = number(head[1]) * k(head)
    const op = part.includes('≤') ? '≤' : '≥'
    const found = /^не измерено/.test(fact) ? [] : [...fact.matchAll(unit.re)]
    const values = found.flatMap((m) => [number(m[1]) * k(m), ...(m[2] ? [number(m[2]) * k(m)] : [])])
    const max = unit.max([goal, ...values])
    const at = (v) => Math.min(100, (v / max) * 100)
    return { goal: at(goal), op, values: values.map(at), range: !!found[0]?.[2], label: found[0]?.[0], ok: values.every((v) => (op === '≤' ? v <= goal : v >= goal)) }
  }
  return null
}

function when(fact) {
  return fact.match(/КТ-\d/)?.[0] || (/данные компании/.test(fact) ? 'данные компании' : '')
}

const DIAL = [60, 58]
const ang = (t) => -135 + 2.7 * t
const f = (n) => +n.toFixed(2)
const pt = (r, a) => [f(DIAL[0] + r * Math.sin((a * Math.PI) / 180)), f(DIAL[1] - r * Math.cos((a * Math.PI) / 180))]
const arc = (r, t0, t1) => `M${pt(r, ang(t0))}A${r} ${r} 0 ${(t1 - t0) * 2.7 > 180 ? 1 : 0} 1 ${pt(r, ang(t1))}`

export function dial(m, company) {
  if (!m && !company) return `<svg viewBox="0 0 120 112" aria-hidden="true"><circle class="d-bezel" cx="60" cy="58" r="53"/><circle class="d-face" cx="60" cy="58" r="48"/></svg>`
  let ticks = ''
  for (let i = 0; i <= 20; i++) ticks += `M${pt(44, ang(i * 5))}L${pt(i % 5 ? 41 : 37.5, ang(i * 5))}`
  const [first, second] = m?.values || []
  const edge = m && (m.op === '≤' ? m.goal < 1 : m.goal > 99)
  const zone = !m ? '' : edge ? `<path class="d-zone" d="M${pt(48, ang(m.goal))}L${pt(40, ang(m.goal))}"/>` : `<path class="d-zone" d="${m.op === '≤' ? arc(46, 0, m.goal) : arc(46, m.goal, 100)}"/>`
  const [lo, hi] = m?.range ? [first, second] : company?.range ? company.values : []
  const band = hi !== undefined ? `<path class="d-band" d="${arc(31, lo, hi)}"/>` : ''
  const shadow = company ? (company.range ? undefined : company.values[0]) : m && !m.range ? second : undefined
  const ghost = shadow !== undefined ? `<path class="d-ghost" d="M${DIAL}L${pt(36, ang(shadow))}"/>` : ''
  const read = first === undefined ? '' : `<text class="d-read" x="60" y="96">${esc(m.label.replace(/\s*из 10$/, ''))}</text>`
  return (
    `<svg viewBox="0 0 120 112" aria-hidden="true"><circle class="d-bezel" cx="60" cy="58" r="53"/><circle class="d-face" cx="60" cy="58" r="48"/>` +
    `${zone}<path class="d-tick" d="${ticks}"/>${band}${ghost}${read}` +
    `<g class="d-needle" data-a="${first === undefined ? -135 : ang(first)}" style="transform:rotate(${first === undefined ? -135 : ang(first)}deg)"><path d="M57.6 66L59.3 21h1.4L62.4 66z"/></g>` +
    `<circle class="d-hub" cx="60" cy="58" r="4.5"/></svg>`
  )
}

function goals(brief) {
  return `<div class="plate dials">${brief.requirements
    .map((r) => {
      const fact = r['Факт или как проверю']
      const m = measure(r.Цель, fact)
      const status = m?.values.length ? (m.values.length > 1 && !m.range ? fact.split(', ').slice(1).join(', ') : '') : when(fact) || (/^пока/.test(fact) ? fact.split(':')[0] : '')
      return (
        `<div class="gauge-cell${m?.values.length ? '' : ' idle'}${m && !m.ok ? ' bad' : ''}">` +
        `<button type="button" class="dial" data-tip="${esc(fact)}" aria-label="${r.ID}">${dial(m)}</button>` +
        `<button type="button" class="d-name" data-br="${r.ID}"><span class="id">${r.ID}</span>${inline(r.Требование)}</button>` +
        `<span class="d-goal">цель ${inline(r.Цель)}${status ? `<em>${esc(status)}</em>` : ''}</span></div>`
      )
    })
    .join('')}</div>`
}

export const factOf = (n) => (n.Факт === 'не измерено' ? '' : n.Факт ? ' in' : ' cap')

export function nfrLegend(items, more = '') {
  const when = [...new Set(items.filter((n) => !n.Факт).map((n) => n['Как проверю'].match(/КТ-\d/)?.[0]).filter(Boolean))]
  const key = (cls, text) => `<span><span class="rj${cls}"><i></i></span>${text}</span>`
  return `<p class="patch-legend nfr-legend">${key(' in', 'есть факт')}${key(' cap', `проверю в ${when.join(' и ')}`)}${key('', 'не измерено')}${more}</p>`
}

function nfrPatch(nfr) {
  const groups = new Map()
  for (const x of nfr.items) {
    const key = x.stage || ''
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(x)
  }
  const order = [...groups.keys()].sort((a, b) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b)))
  const cols = order
    .map((key) => {
      const items = groups.get(key)
      const jacks = items
        .map((x) => `<button type="button" class="jack${nfr.key.includes(x.ID) ? ' key' : ''}" data-nfr="${x.ID}"><span class="id">${x.ID}</span><span>${inline(x.Требование)}</span></button>`)
        .join('')
      const ports = items.map((x) => `<button type="button" class="rj${factOf(x)}" data-port="${x.ID}" data-nfr="${x.ID}" aria-label="${x.ID}"><i></i></button>`).join('')
      return `<div class="patch-col"><div class="patch-head"><b>${items.length}</b><span>${key ? `проверю в ${key}` : 'без срока'}</span></div><div class="rjs">${ports}</div><div class="jacks">${jacks}</div></div>`
    })
    .join('')
  return `<div class="patch" style="--cols:${order.length}">${cols}</div>${nfrLegend(nfr.items, '<span><b>Жирным</b> главные для защиты КТ-1</span>')}`
}

const breaker = (r) =>
  `<div class="brk${r.id === 'R-01' ? ' own' : ''}"><button type="button" class="brk-tape" data-risk="${r.id}"><b>${r.id}</b><span class="brk-text">${inline(r.text)}</span><span class="brk-text alt">${inline(r.measure)}</span></button>` +
  `<button type="button" class="brk-lever" aria-pressed="false" aria-label="${r.id}: мера"><i></i></button></div>`

function risks(list) {
  const P = ['низкая', 'средняя', 'высокая']
  const I = ['низкое', 'среднее', 'высокое']
  let cells = ''
  for (let p = 2; p >= 0; p--) {
    cells += `<span class="sb-ax">${P[p]}</span>`
    for (let i = 0; i <= 2; i++) cells += `<div class="sb-cell">${list.filter((r) => r.p === p && r.i === i).map(breaker).join('')}</div>`
  }
  cells += `<span></span>${I.map((x) => `<span class="sb-ax">${x}</span>`).join('')}`
  return `<div class="plate sb"><span class="sb-y">вероятность</span><div class="sb-grid">${cells}</div><span class="sb-x">влияние</span></div>`
}

function plan(data, focus) {
  const max = Math.max(...data.stages.map(hours))
  const team = data.team.map((m) => `<p class="team"><b>${esc(m.Участник)}</b><span>${inline(m.Ответственность)}</span></p>`).join('')
  const rows = data.stages
    .filter((s) => s.tasks.length)
    .map((s) => {
      const done = s.items.length && s.items.every((x) => x.done)
      const cols = s.tasks
        .map((t) => {
          const h = Number(t.Оценка || 0)
          return `<button type="button" class="pc-task" style="--n:${h}" data-tip="${esc(t.ID + ': ' + t.Задача.replace(/`/g, ''))}"><b>${h > 1 ? esc(t.ID) : ''}</b><span class="pc-holes">${'<i></i>'.repeat(h)}</span></button>`
        })
        .join('')
      return `<div class="pc-row${done ? ' done' : ''}${s === focus ? ' now' : ''}"><span class="pc-id">${esc(s.id)}</span><div class="pc-line" style="--cols:${max}">${cols}</div><span class="pc-sum">${hours(s)} ч</span></div>`
    })
    .join('')
  return `${team}<div class="pcard">${rows}</div>`
}

const TALE = {
  problem: 'Эта история про один сервер. Он стоит в стойке, за него платят каждый месяц, а его диски почти ничего не пишут.',
  compare: 'Готовые инструменты показывают такой сервер по частям, и каждому чего-то не хватает.',
  value: 'Когда сервер виден сразу, выигрывает не только инженер.',
  usm: 'Путь этого сервера от карты до заявки на вывод описывает сценарий E2E-1. Два других сценария про проверку через ИИ и свежесть данных.',
  goals: 'По этим приборам я пойму, что карта работает. Где стрелка лежит на нуле, замера ещё нет.',
  nfr: 'Карта берёт данные о сервере из чужих систем, поэтому она не должна их нагружать и отдавать лишнее в LLM.',
  risks: 'Самый близкий к этой истории риск: карта примет резерв за простой, и команда попросит вывести нужный сервер.',
  plan: 'Дальше по часам то, что я сделаю, чтобы карта сама находила такие серверы.',
}

export function renderKt1(data, stage) {
  const b = data.brief
  const stories = data.stories.items.length
  const criteria = data.stories.items.reduce((s, x) => s + x.criteria.length, 0)
  const units =
    blank('Проблема и ценность') +
    device('Проблема', tale(TALE.problem) + problem(b), docLink(BRIEF, 'проблема')) +
    device('Альтернативы', tale(TALE.compare) + compare(b), docLink(BRIEF, 'альтернативы')) +
    device('Ценность', tale(TALE.value) + value(b), docLink(BRIEF, 'ценность')) +
    blank('Требования') +
    device(
      'Карта историй',
      tale(TALE.usm) + '<div id="usm-root" class="plate pcb"></div>',
      `<span>${stories} ${plural(stories, 'история', 'истории', 'историй')} MVP, ${criteria} ${plural(criteria, 'критерий', 'критерия', 'критериев')} приёмки</span>${docLink('docs/requirements/usm.md')}`,
    ) +
    device('Бизнес-цели', tale(TALE.goals) + goals(b), docLink(BRIEF, 'бизнес-требования')) +
    device('Нефункциональные требования', tale(TALE.nfr) + nfrPatch(data.nfr), docLink('docs/requirements/nfr.md')) +
    device('Риски', tale(TALE.risks) + risks(b.risks), docLink(BRIEF, 'риски')) +
    blank('Команда и план') +
    device('План по часам', tale(TALE.plan) + plan(data, stage), docLink('docs/backlog.md', 'курсовой-проект')) +
    blank('Сдача') +
    device('Сдаётся', bays(stage))
  return cover(data) + rack(units)
}

function mountKvm(root, alts) {
  const kvm = root.querySelector('.kvm')
  const screen = kvm.querySelector('.kvm-screen')
  const pick = (i, quiet) => {
    for (const key of kvm.querySelectorAll('.key')) key.setAttribute('aria-pressed', String(key.dataset.alt === String(i)))
    const a = alts[i]
    const note = a.Альтернатива.match(/\((.*)\)$/)?.[1]
    screen.innerHTML =
      `<b>${inline(a.Альтернатива.replace(/\s*\(.*\)$/, ''))}</b>${note ? `<span class="alt-note">${inline(note)}</span>` : ''}` +
      `<p><span>умеет</span>${inline(a['Что умеет'])}</p><p><span>не хватает</span>${inline(a['Чего не хватает'])}</p>`
    if (quiet) return
    screen.classList.remove('flip')
    void screen.offsetWidth
    screen.classList.add('flip')
  }
  kvm.addEventListener('click', (event) => {
    const key = event.target.closest('.key')
    if (key) pick(key.dataset.alt)
  })
  pick(Math.max(0, alts.findIndex((a) => a.Альтернатива.startsWith('Ручной разбор'))), true)
}

function mountBus(root, still) {
  const bus = root.querySelector('.bus')
  const packet = bus.querySelector('.packet')
  bus.addEventListener('click', (event) => {
    const tap = event.target.closest('.tap')
    if (!tap) return
    for (const t of bus.querySelectorAll('.tap.on')) t.classList.remove('on')
    const y = tap.querySelector('.port').getBoundingClientRect().top - packet.parentElement.getBoundingClientRect().top - packet.offsetTop
    if (still) return tap.classList.add('on')
    packet.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${y}px)`, opacity: 1 }], { duration: 260 + y * 0.7, easing: 'cubic-bezier(.55, 0, .35, 1)' }).finished.then(() => tap.classList.add('on'))
  })
}

function mountPatch(root, still) {
  const patch = root.querySelector('.patch')
  const pair = (el) => {
    const id = el.dataset.port || el.dataset.nfr
    return [patch.querySelector(`[data-port="${id}"]`), patch.querySelector(`.jack[data-nfr="${id}"]`)]
  }
  patch.addEventListener('pointerover', (event) => {
    for (const el of patch.querySelectorAll('.lit')) el.classList.remove('lit')
    const el = event.target.closest('[data-port], .jack')
    if (el) for (const x of pair(el)) x?.classList.add('lit')
  })
  patch.addEventListener('pointerleave', () => {
    for (const el of patch.querySelectorAll('.lit')) el.classList.remove('lit')
  })
  patch.addEventListener('click', (event) => {
    const rj = event.target.closest('[data-port]')
    if (!rj || still) return
    rj.classList.remove('seat')
    void rj.offsetWidth
    rj.classList.add('seat')
  })
}

function mountDials(root, still) {
  root.querySelector('.dials').addEventListener('click', (event) => {
    const needle = event.target.closest('.dial')?.querySelector('.d-needle')
    if (!needle || still) return
    const a = Number(needle.dataset.a)
    const frames = a === -135 ? [-135, -112, -135, -124, -135] : [-135, a + 14, a - 5, a + 2, a]
    needle.animate(
      frames.map((x) => ({ transform: `rotate(${x}deg)` })),
      { duration: a === -135 ? 700 : 1100, easing: 'cubic-bezier(.3, .7, .3, 1)' },
    )
  })
}

function mountBreakers(root) {
  root.querySelector('.sb').addEventListener('click', (event) => {
    const lever = event.target.closest('.brk-lever')
    if (!lever) return
    const off = lever.closest('.brk').classList.toggle('off')
    lever.setAttribute('aria-pressed', String(off))
  })
}

function mountCard(root, still) {
  root.querySelector('.pcard').addEventListener('click', (event) => {
    const task = event.target.closest('.pc-task')
    if (!task || still) return
    const done = task.closest('.pc-row').classList.contains('done')
    task.querySelectorAll('.pc-holes i').forEach((hole, i) => {
      if (!done) return hole.animate([{ transform: 'none' }, { transform: 'scale(.4)' }, { transform: 'none' }], { duration: 320, delay: i * 45 })
      const chad = document.createElement('span')
      chad.className = 'chad'
      hole.append(chad)
      chad
        .animate(
          [
            { transform: 'none', opacity: 1 },
            { transform: `translate(${(i % 3) - 1}px, 26px) rotate(${(i % 2 ? 1 : -1) * 70}deg)`, opacity: 0 },
          ],
          { duration: 560, delay: i * 45, easing: 'cubic-bezier(.5, 0, .9, .6)', fill: 'backwards' },
        )
        .finished.then(() => chad.remove())
    })
  })
}

export function mountKt1(root, data, open) {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches
  mountRack(root)
  mountServer(root)
  mountKvm(root, data.brief.alternatives)
  mountBus(root, still)
  mountPatch(root, still)
  mountDials(root, still)
  mountBreakers(root)
  mountCard(root, still)
  mountUsm(root.querySelector('#usm-root'), data, open).select(data.usm.scenarios[0]?.id, true)
}
