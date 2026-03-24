import { useEffect, useState } from 'react'
import { detectLocale } from './locale'
import { getMessage, type Locale, type TranslateFn } from './messages'

export function useI18n(): { locale: Locale; t: TranslateFn } {
  const [locale, setLocale] = useState<Locale>(() => detectLocale())

  useEffect(() => {
    const onLanguageChange = () => setLocale(detectLocale())
    if (typeof window !== 'undefined') {
      window.addEventListener('languagechange', onLanguageChange)
      return () =>
        window.removeEventListener('languagechange', onLanguageChange)
    }
  }, [])

  return {
    locale,
    t: (key, params) => getMessage(locale, key, params),
  }
}
