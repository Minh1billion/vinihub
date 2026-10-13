import { flushSync } from 'react-dom'
import i18n from './index.js'
import { fitNow } from './fit.js'

const FONTS = [
  '400 15px "Be Vietnam Pro"', '500 15px "Be Vietnam Pro"', '600 15px "Be Vietnam Pro"', '700 15px "Be Vietnam Pro"',
  '600 16px "Chakra Petch"', '700 20px "Chakra Petch"',
]
const SAMPLE = {
  vi: 'Ăă Ââ Êê Ôô Ơơ Ưư Đđ ắằẳẵặ ếềểễệ ốồổỗộ ớờởỡợ ứừửữự',
  en: 'Aa Bb Cc',
}
const FONT_WAIT_MS = 700

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function preloadFonts(code) {
  if (!document.fonts?.load) return Promise.resolve()
  const sample = SAMPLE[code] || SAMPLE.en
  const loading = Promise.all(FONTS.map((f) => document.fonts.load(f, sample))).catch(() => {})
  return Promise.race([loading, new Promise((resolve) => setTimeout(resolve, FONT_WAIT_MS))])
}

let busy = false

export async function switchLanguage(code, beforeCommit) {
  if (busy || code === i18n.resolvedLanguage) { beforeCommit?.(); return }
  busy = true
  const root = document.documentElement
  const commit = async () => {
    let pending
    flushSync(() => {
      beforeCommit?.()
      pending = i18n.changeLanguage(code)
    })
    await pending
    fitNow()
  }
  try {
    await preloadFonts(code)
    root.dataset.switchingLang = ''
    if (reducedMotion()) {
      await commit()
    } else if (document.startViewTransition) {
      await document.startViewTransition(commit).finished.catch(() => {})
    } else {
      await commit()
      document.getElementById('root')?.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' })
    }
  } finally {
    delete root.dataset.switchingLang
    busy = false
  }
}
