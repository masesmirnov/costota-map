const REPOSITORY = 'masesmirnov/costota-map'

const STAGES = [
  {
    id: 'КТ-1',
    title: 'Проблема и требования',
    weight: 10,
    items: [
      { label: 'Brief: проблема, ценность, бизнес-требования, риски', docs: ['docs/product/brief.md'] },
      { label: 'User Story Map с линией MVP', docs: ['docs/requirements/usm.md'] },
      { label: 'Истории с критериями приёмки', docs: ['docs/requirements/stories.md'] },
      { label: 'НФТ с порогами и планом проверки', docs: ['docs/requirements/nfr.md'] },
      { label: 'README с командой и бэклог', docs: ['README.md', 'docs/backlog.md'] },
    ],
  },
  {
    id: 'КТ-2',
    title: 'Архитектура и каркас',
    weight: 15,
    items: [
      { label: 'Схемы: контекст, контейнеры, развёртывание, две последовательности, ERD', docs: [] },
      { label: 'ADR, не меньше трёх', docs: [] },
      { label: 'OpenAPI, примеры и коллекция запросов', docs: [] },
      { label: 'Путь запрос → логика → хранилище → ответ и тесты', docs: [] },
      { label: 'Dockerfile, compose.yaml, .env.example', docs: [] },
      { label: 'CI: линтер, типы, тесты, сборка, поиск секретов', docs: [] },
      { label: 'Тест-стратегия и трассировка', docs: ['docs/quality/strategy.md', 'docs/requirements/traceability.md'] },
    ],
  },
  {
    id: 'КТ-3',
    title: 'MVP и качество',
    weight: 20,
    items: [
      { label: 'Unit-, интеграционные и API-тесты', docs: [] },
      { label: 'Отчёт о качестве со ссылками на CI', docs: ['docs/quality/report.md'] },
      { label: 'CD: образ и автодеплой со smoke-тестом', docs: [] },
      { label: 'ПСИ: сценарии AT и пробный прогон', docs: ['docs/acceptance/psi.md'] },
      { label: 'CHANGELOG с изменениями scope', docs: ['CHANGELOG.md'] },
    ],
  },
  {
    id: 'КТ-4',
    title: 'Релиз-кандидат',
    weight: 25,
    items: [
      { label: 'Протокол ПСИ с PASS и FAIL', docs: ['docs/acceptance/psi.md'] },
      { label: 'Отчёт по каждому НФТ: цель, факт, метод', docs: ['docs/quality/report.md'] },
      { label: 'Runbook: развёртывание, два отказа, откат, восстановление', docs: ['docs/operations/runbook.md'] },
      { label: 'CHANGELOG с известными ограничениями', docs: ['CHANGELOG.md'] },
      { label: 'Черновик pitch deck, сценарий и резервная запись демо', docs: ['docs/defense/demo.md'] },
    ],
  },
  {
    id: 'Защита',
    title: 'Финальная защита',
    weight: 30,
    items: [
      { label: 'Тег v1.0.0', docs: [] },
      { label: 'Digest образа в README', docs: ['README.md'] },
    ],
  },
]

const ROW = /^\|(.+)\|\s*$/
const RULE = /^\|[\s:|-]+\|\s*$/
const HEADING = /^(#{1,6})\s+(.*)$/

const files = new Map()

function read(path) {
  if (!files.has(path)) {
    files.set(
      path,
      fetch('../' + path, { cache: 'no-cache' })
        .then((r) => r.text())
        .then((t) => t.replace(/\r\n?/g, '\n')),
    )
  }
  return files.get(path)
}

const lines = (text) => (text.endsWith('\n') ? text.slice(0, -1) : text).split('\n')
const head = (text) => text.split('\n## ')[0]
const rest = (text) => text.slice(text.indexOf('\n') + 1)
const cells = (line) => line.match(ROW)[1].split('|').map((c) => c.trim())
const refs = (text, prefix) => text.match(new RegExp(prefix + '-\\d+', 'g')) || []
const strip = (value = '') => value.replace(/^[` ]+|[` ]+$/g, '')

function tables(text) {
  const found = []
  const all = lines(text)
  let i = 0
  while (i < all.length) {
    if (ROW.test(all[i]) && i + 1 < all.length && RULE.test(all[i + 1])) {
      const names = cells(all[i])
      const rows = []
      for (i += 2; i < all.length && ROW.test(all[i]); i++) {
        const values = cells(all[i])
        rows.push(Object.fromEntries(names.slice(0, values.length).map((n, j) => [n, values[j]])))
      }
      found.push(rows)
    } else i++
  }
  return found
}

function sections(text, level) {
  const result = {}
  let title = null
  let body = []
  for (const line of lines(text)) {
    const m = line.match(HEADING)
    if (m && m[1].length <= level) {
      if (title !== null) result[title] = body.join('\n')
      title = m[1].length === level ? m[2].trim() : null
      body = []
    } else if (title !== null) body.push(line)
  }
  if (title !== null) result[title] = body.join('\n')
  return result
}

const paragraphs = (text) =>
  text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b && !/^(\||- |#|```)/.test(b))
    .map((b) => b.split('\n').join(' '))

const bullets = (text) => lines(text).filter((l) => l.startsWith('- ')).map((l) => l.slice(2).trim())

function sentence(text) {
  const m = text.match(/^(.+?[.!?])\s+(\S.*)$/)
  return m ? [m[1], m[2]] : [text, '']
}

function iso(day) {
  const m = day.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

async function readme() {
  const text = await read('README.md')
  const parts = sections(text, 2)
  return {
    title: lines(text)[0].match(HEADING)[2],
    intro: paragraphs(rest(head(text))),
    team: tables(parts['Команда'])[0],
    points: Object.fromEntries(tables(parts['Контрольные точки'])[0].map((row) => [row.КТ, row])),
  }
}

async function brief() {
  const top = sections(await read('docs/product/brief.md'), 2)
  const problem = sections(top['Проблема'], 3)
  const [inside, outside] = top['Границы'].split('**Не входит:**')
  return {
    what: paragraphs(top['Что это']),
    segment: paragraphs(top['Сегмент и пользователи']),
    roles: tables(top['Сегмент и пользователи'])[0],
    problem: paragraphs(top['Проблема'].split('### ')[0]),
    facts: tables(problem['Факты'])[0].map((row) => {
      const [first, more] = sentence(row.Факт)
      return { id: row.ID, head: first, rest: more, source: row.Источник }
    }),
    hypotheses: tables(problem['Гипотезы'])[0],
    hypothesesNote: paragraphs(problem['Гипотезы']),
    alternatives: tables(top['Альтернативы'])[0],
    value: bullets(top['Ценность']),
    inside: bullets(inside),
    outside: bullets(outside),
    requirements: tables(top['Бизнес-требования'])[0],
    risks: tables(top['Риски'])[0].map((row) => ({
      id: row.ID,
      text: row.Риск,
      p: ['низкая', 'средняя', 'высокая'].indexOf(row.Вероятность),
      i: ['низкое', 'среднее', 'высокое'].indexOf(row.Влияние),
      owner: row.Владелец,
      measure: row.Мера,
    })),
  }
}

async function usm() {
  const [listing, scenarios] = tables(await read('docs/requirements/usm.md'))
  return {
    activities: listing.map((row) => ({
      name: row.Активность.replace(/^\d+\.\s*/, ''),
      steps: row.Шаги,
      mvp: refs(row.MVP, 'US'),
      next: refs(row['Следующий срез'], 'N'),
      out: row['Вне scope']
        .split(';')
        .map((p) => p.trim())
        .filter(Boolean),
    })),
    scenarios: scenarios.map((row) => ({ id: row.ID, title: row.Сценарий, path: refs(row['Путь по карте'], 'US'), logic: row['Что в нём кроме CRUD'] })),
  }
}

async function stories() {
  const text = await read('docs/requirements/stories.md')
  const ac = /^- \*\*(AC-\d+)\.\*\* Given (.+?), When (.+?), Then (.+)$/
  const found = []
  let story = null
  for (const raw of text.split(/\n\s*\n/)) {
    const block = raw.trim()
    const title = block.match(/^### (US-\d+)\. (.+)$/)
    if (title) {
      story = { id: title[1], title: title[2], notes: [], criteria: [] }
      found.push(story)
    } else if (block.startsWith('## ')) story = null
    else if (!story) continue
    else if (block.startsWith('|')) Object.assign(story, tables(block)[0][0])
    else if (block.startsWith('- **AC')) {
      for (const line of block.split('\n')) {
        const m = line.match(ac)
        story.criteria.push({ id: m[1], given: m[2], when: m[3], then: m[4] })
      }
    } else if (block.startsWith('Как ')) story.story = block
    else if (block.startsWith('Основной путь:')) story.path = block.slice(block.indexOf(':') + 1).trim()
    else if (block.startsWith('Ошибки:')) story.errors = block.slice(block.indexOf(':') + 1).trim()
    else story.notes.push(block.split('\n').join(' '))
  }
  return { intro: paragraphs(rest(head(text))), items: found, next: tables(sections(text, 2)['Следующий срез'])[0] }
}

async function nfr() {
  const text = await read('docs/requirements/nfr.md')
  const key = text.match(/Главные для защиты КТ-1: ([^.]+)\./)
  return {
    intro: paragraphs(rest(head(text)).split('\n|')[0]),
    key: key ? refs(key[1], 'NFR') : [],
    items: tables(text)[0].map((row) => ({ ...row, stage: (row['Как проверю'].match(/КТ-\d/) || [null])[0] })),
    unknown: bullets(sections(text, 2)['Что пока неизвестно'] || ''),
  }
}

async function tasks() {
  return tables(sections(await read('docs/backlog.md'), 2)['Курсовой проект'])[0]
}

async function traceability() {
  return Object.fromEntries(tables(await read('docs/requirements/traceability.md'))[0].map((row) => [row.BR, refs(row.Истории, 'US')]))
}

async function later() {
  const trace = await read('docs/requirements/traceability.md')
  return {
    levels: Object.fromEntries([...trace.match(/^Уровни: (.+)\.$/m)[1].matchAll(/(\S+) \(([^)]+)\)/g)].map((m) => [m[1], m[2]])),
    tests: tables(trace).find((rows) => rows.length && 'Уровень' in rows[0]),
  }
}

function stages(points, list) {
  let current = null
  return STAGES.map((stage) => {
    const point = points[stage.id] || {}
    const sha = strip(point.SHA)
    const status = sha ? 'passed' : current === null ? (current = 'current') : 'locked'
    return {
      id: stage.id,
      title: stage.title,
      weight: stage.weight,
      date: iso(point.Срок || ''),
      tag: strip(point.Тег) || null,
      sha: sha || null,
      summary: point['Что сделано'] || '',
      status,
      items: stage.items.map((item) => ({
        label: item.label,
        done: status === 'passed' || (status === 'current' && item.docs.length > 0 && item.docs.every((doc) => files.has(doc))),
        docs: item.docs,
      })),
      tasks: list.filter((task) => task.КТ.toLowerCase() === stage.id.toLowerCase()),
    }
  })
}

export async function load() {
  const [top, list, b, u, s, n, trace, extra] = await Promise.all([readme(), tasks(), brief(), usm(), stories(), nfr(), traceability(), later()])
  return {
    repository: REPOSITORY,
    title: top.title,
    intro: top.intro,
    team: top.team,
    stages: stages(top.points, list),
    brief: b,
    usm: u,
    stories: s,
    nfr: n,
    trace,
    later: extra,
  }
}
