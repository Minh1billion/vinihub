import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import vi from './locales/vi.json'

export const DEFAULT_LANG = 'vi'
export const LANGUAGES = [
  { code: 'vi', label: 'VI', name: 'Tiếng Việt', locale: 'vi-VN' },
  { code: 'en', label: 'EN', name: 'English', locale: 'en-US' },
]

const STORAGE_KEY = 'vinihub.lang'
const COOKIE_KEY = 'vh_lang'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { vi: { translation: vi }, en: { translation: en } },
    supportedLngs: LANGUAGES.map((l) => l.code),
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    fallbackLng: DEFAULT_LANG,
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], lookupLocalStorage: STORAGE_KEY, caches: ['localStorage'] },
  })

const current = () => i18n.resolvedLanguage || DEFAULT_LANG

function sync() {
  const lang = current()
  document.documentElement.lang = lang
  document.cookie = `${COOKIE_KEY}=${lang}; path=/; max-age=31536000; samesite=lax`
}

i18n.on('languageChanged', sync)
sync()

export const intlLocale = () => (LANGUAGES.find((l) => l.code === current()) || LANGUAGES[0]).locale

export default i18n
