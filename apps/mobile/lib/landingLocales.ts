import type { LandingTranslations } from '@tscopier/web-i18n/locales/landing/types'
import { landingAr } from '@tscopier/web-i18n/locales/landing/ar'
import { landingEn } from '@tscopier/web-i18n/locales/landing/en'
import { landingEs } from '@tscopier/web-i18n/locales/landing/es'
import { landingFr } from '@tscopier/web-i18n/locales/landing/fr'
import { landingJa } from '@tscopier/web-i18n/locales/landing/ja'
import { landingNl } from '@tscopier/web-i18n/locales/landing/nl'
import { landingPl } from '@tscopier/web-i18n/locales/landing/pl'
import { landingRu } from '@tscopier/web-i18n/locales/landing/ru'
import { landingSv } from '@tscopier/web-i18n/locales/landing/sv'
import type { Locale } from '@tscopier/web-i18n/types'

/**
 * Static landing bundles for Metro (web `loadTranslations` uses dynamic import,
 * which breaks in React Native with "Requiring unknown module").
 */
const LANDING_BY_LOCALE: Record<Locale, LandingTranslations> = {
  en: landingEn,
  es: landingEs,
  fr: landingFr,
  pl: landingPl,
  ru: landingRu,
  sv: landingSv,
  nl: landingNl,
  ja: landingJa,
  ar: landingAr,
}

export function getLandingTranslations(locale: Locale): LandingTranslations {
  return LANDING_BY_LOCALE[locale] ?? landingEn
}
