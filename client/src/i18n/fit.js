import i18n from './index.js'

// Controls keep a fixed size in every language. When a label is wider than its
// control (Vietnamese is ~10-30% longer than English), the font shrinks to fit
// instead of the control growing or the text wrapping.
const SELECTOR = [
  '[data-fit]',
  '.btn',
  '.segmented button',
  '.page-tabs a',
  '.side-nav a',
  '.mobile-nav a',
].join(',')

const MIN_RATIO = 0.76 // never go below 76% of the designed size
const MIN_PX = 10
const STEP = 0.5
const TOLERANCE = 0.5

const overflows = (el) => el.scrollWidth > el.clientWidth + TOLERANCE

function fitOne(el) {
  if (!el.clientWidth || !overflows(el)) return
  const base = parseFloat(getComputedStyle(el).fontSize)
  const min = Math.max(MIN_PX, base * MIN_RATIO)
  let size = base
  while (size > min && overflows(el)) {
    size -= STEP
    el.style.fontSize = `${size}px`
  }
}

export function fitNow(root = document) {
  const nodes = root.querySelectorAll(SELECTOR)
  nodes.forEach((el) => { if (el.style.fontSize) el.style.fontSize = '' })
  nodes.forEach(fitOne)
}

let frame = 0
export function scheduleFit() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => fitNow())
}

export function initFitText() {
  const root = document.getElementById('root')
  if (!root) return
  i18n.on('languageChanged', scheduleFit)
  new MutationObserver(scheduleFit).observe(root, { childList: true, subtree: true, characterData: true })
  window.addEventListener('resize', scheduleFit)
  window.addEventListener('vh:fit', scheduleFit)
  document.fonts?.addEventListener?.('loadingdone', scheduleFit)
  document.fonts?.ready.then(scheduleFit)
  scheduleFit()
}
