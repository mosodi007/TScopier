import type {
  LandingFeatureVisualId,
  LandingTranslations,
} from '@tscopier/web-i18n/locales/landing/types'
import type { Locale } from '@tscopier/web-i18n/types'

export type WelcomeFeatureVisualId = Extract<
  LandingFeatureVisualId,
  'copier' | 'multilingual' | 'filters' | 'logs'
>

export interface WelcomeIntroSlide {
  kind: 'intro'
  id: 'intro'
  greeting: string
  headline: string
  supporting: string
}

export interface WelcomeFeatureSlide {
  kind: 'feature'
  id: WelcomeFeatureVisualId
  eyebrow: string
  title: string
  description: string
}

export type WelcomeSlide = WelcomeIntroSlide | WelcomeFeatureSlide

const WELCOME_VISUAL_IDS: WelcomeFeatureVisualId[] = [
  'copier',
  'multilingual',
  'filters',
  'logs',
]

const GREETINGS: Record<Locale, string> = {
  en: 'Welcome to TScopier.',
  es: 'Bienvenido a TScopier.',
  fr: 'Bienvenue sur TScopier.',
  pl: 'Witamy w TScopier.',
  ru: 'Добро пожаловать в TScopier.',
  sv: 'Välkommen till TScopier.',
  nl: 'Welkom bij TScopier.',
  ja: 'TScopierへようこそ。',
  ar: 'مرحبًا بك في TScopier.',
}

export interface WelcomeChromeCopy {
  skip: string
  next: string
  getStarted: string
  trialHint: string
}

const CHROME: Record<Locale, WelcomeChromeCopy> = {
  en: {
    skip: 'Skip',
    next: 'Next',
    getStarted: 'Get started',
    trialHint: 'Start your 10-day free trial after you create an account.',
  },
  es: {
    skip: 'Omitir',
    next: 'Siguiente',
    getStarted: 'Empezar',
    trialHint: 'Empieza tu prueba gratis de 10 días después de crear una cuenta.',
  },
  fr: {
    skip: 'Passer',
    next: 'Suivant',
    getStarted: 'Commencer',
    trialHint: 'Démarrez votre essai gratuit de 10 jours après la création du compte.',
  },
  pl: {
    skip: 'Pomiń',
    next: 'Dalej',
    getStarted: 'Rozpocznij',
    trialHint: 'Rozpocznij 10-dniowy bezpłatny okres próbny po utworzeniu konta.',
  },
  ru: {
    skip: 'Пропустить',
    next: 'Далее',
    getStarted: 'Начать',
    trialHint: 'Начните 10-дневный бесплатный пробный период после создания аккаунта.',
  },
  sv: {
    skip: 'Hoppa över',
    next: 'Nästa',
    getStarted: 'Kom igång',
    trialHint: 'Starta din 10-dagars gratisperiod efter att du skapat ett konto.',
  },
  nl: {
    skip: 'Overslaan',
    next: 'Volgende',
    getStarted: 'Aan de slag',
    trialHint: 'Start je 10-daagse gratis proefperiode na het aanmaken van een account.',
  },
  ja: {
    skip: 'スキップ',
    next: '次へ',
    getStarted: 'はじめる',
    trialHint: 'アカウント作成後、10日間の無料トライアルを開始できます。',
  },
  ar: {
    skip: 'تخطّي',
    next: 'التالي',
    getStarted: 'ابدأ',
    trialHint: 'ابدأ تجربتك المجانية لمدة 10 أيام بعد إنشاء حسابك.',
  },
}

export function getWelcomeChrome(locale: Locale): WelcomeChromeCopy {
  return CHROME[locale] ?? CHROME.en
}

export function buildWelcomeSlides(
  landing: LandingTranslations,
  locale: Locale = 'en',
): WelcomeSlide[] {
  const intro: WelcomeIntroSlide = {
    kind: 'intro',
    id: 'intro',
    greeting: GREETINGS[locale] ?? GREETINGS.en,
    headline: landing.hero.headline,
    supporting: landing.hero.subheadline,
  }

  const features: WelcomeFeatureSlide[] = landing.features.showcases
    .filter(
      (
        s,
      ): s is (typeof landing.features.showcases)[number] & {
        visual: WelcomeFeatureVisualId
      } => WELCOME_VISUAL_IDS.includes(s.visual as WelcomeFeatureVisualId),
    )
    .map(s => ({
      kind: 'feature' as const,
      id: s.visual as WelcomeFeatureVisualId,
      eyebrow: s.eyebrow,
      title: s.title,
      description: s.description,
    }))

  return [intro, ...features]
}
