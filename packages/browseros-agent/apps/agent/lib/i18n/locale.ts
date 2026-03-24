import type { Locale } from './messages'

export function normalizeLocale(input?: string | null): Locale {
  if (!input) return 'en'
  return input.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

export function detectLocale(): Locale {
  try {
    if (typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage) {
      return normalizeLocale(chrome.i18n.getUILanguage())
    }
  } catch {
    // ignore
  }

  if (typeof navigator !== 'undefined') {
    return normalizeLocale(navigator.language)
  }

  return 'en'
}
