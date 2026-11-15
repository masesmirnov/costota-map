export const icon = (name) => `<svg><use href="#${name}"/></svg>`

export const plural = (n, one, few, many) => {
  const m10 = n % 10, m100 = n % 100
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many
}

export const name = (stage) => (stage.id.startsWith('КТ-') ? `${stage.id}. ${stage.title}` : stage.title)

export const anchor = (stage) => (stage.id.startsWith('КТ-') ? 'kt-' + stage.id.slice(3) : 'final')

export function ids(text) {
  const out = []
  for (const m of String(text).matchAll(/([A-Z]+)-(\d+)(?:…[A-Z]+-(\d+))?/g)) {
    const [, p, a, b] = m
    for (let i = +a; i <= +(b || a); i++) out.push(`${p}-${String(i).padStart(a.length, '0')}`)
  }
  return out
}
