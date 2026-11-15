import { marked } from 'marked'

const dialog = document.getElementById('sheet')
const head = document.getElementById('sheet-title')
const body = document.getElementById('sheet-body')
let onClose = null
let back = ''
let own = ''
let trigger = null

export const esc = (text) =>
  String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export const inline = (text) => marked.parseInline(String(text ?? ''))

export const slug = (text) =>
  String(text)
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')

function place() {
  if (matchMedia('(max-width: 640px)').matches) return
  const w = dialog.offsetWidth
  const h = dialog.offsetHeight
  const r = trigger?.isConnected && trigger.getClientRects().length ? trigger.getBoundingClientRect() : null
  let x = r ? r.left : (innerWidth - w) / 2
  let y = r ? r.bottom + 8 : 88
  if (r && y + h > innerHeight - 12) y = r.top - h - 8 >= 72 ? r.top - h - 8 : Math.max(72, innerHeight - h - 12)
  x = Math.max(16, Math.min(innerWidth - w - 16, x))
  dialog.style.left = `${Math.round(x + scrollX)}px`
  dialog.style.top = `${Math.round(y + scrollY)}px`
}

export function openSheet(title, html, hash, closed) {
  head.innerHTML = title
  body.innerHTML = html
  body.scrollTop = 0
  onClose = closed || null
  if (!dialog.open) {
    back = location.hash
    dialog.style.top = `${Math.round(scrollY + 80)}px`
    dialog.show()
  }
  place()
  if (hash) {
    history.replaceState(null, '', '#' + hash)
    own = location.hash
  }
  return body
}

export function closeSheet() {
  if (!dialog.open) return
  dialog.close()
  if (own && location.hash === own) history.replaceState(null, '', back || location.pathname + location.search)
  own = ''
}

dialog.addEventListener('close', () => {
  if (dialog.open) return
  onClose?.()
  onClose = null
})
document.addEventListener(
  'click',
  (event) => {
    if (!dialog.contains(event.target)) trigger = event.target.closest('button, a, [tabindex]')
  },
  true,
)
document.addEventListener('pointerdown', (event) => {
  if (dialog.open && !dialog.contains(event.target)) closeSheet()
})
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && dialog.open) closeSheet()
})
addEventListener('resize', () => dialog.open && place())
document.getElementById('sheet-close').addEventListener('click', closeSheet)

