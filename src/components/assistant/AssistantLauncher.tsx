import { useEffect, useState } from 'react'
import { Minus, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../../context/AuthContext'
import { useAssistant } from '../../context/useAssistant'
import { useT } from '../../context/LocaleContext'
import { useLiveChat } from '../../context/LiveChatContext'

const STORAGE_KEY = 'tscopier-assistant-launcher-collapsed'

function readCollapsedPreference() {
  if (typeof window === 'undefined') return false
  return window.sessionStorage.getItem(STORAGE_KEY) === 'true'
}

export function AssistantLauncher() {
  const { user } = useAuth()
  const { open, openAssistant } = useAssistant()
  const { visibility: liveChatVisibility } = useLiveChat()
  const t = useT()
  const a = t.nav.assistant
  const [collapsed, setCollapsed] = useState(readCollapsedPreference)

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(STORAGE_KEY, String(collapsed))
  }, [collapsed])

  if (!user || open || liveChatVisibility === 'maximized') return null

  const handleOpen = () => {
    openAssistant()
  }

  if (collapsed) {
    return (
      <button
        type="button"
        aria-label={a.ariaLabel}
        title={a.title}
        onClick={handleOpen}
        className={clsx(
          'fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] end-3 z-40',
          'inline-flex h-12 w-12 items-center justify-center rounded-full border border-teal-200 bg-white text-teal-700 shadow-lg shadow-neutral-900/10',
          'transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-white',
          'dark:border-teal-900/70 dark:bg-neutral-900 dark:text-teal-300 dark:shadow-black/30 dark:hover:bg-teal-950/50 dark:focus:ring-offset-neutral-950',
          'sm:bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:end-5',
        )}
      >
        <Sparkles className="h-5 w-5" aria-hidden />
      </button>
    )
  }

  return (
    <div
      className={clsx(
        'fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] end-3 z-40 w-[min(calc(100vw-1.5rem),18rem)]',
        'sm:bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] sm:end-5 sm:w-72',
      )}
    >
      <button
        type="button"
        aria-label={a.ariaLabel}
        onClick={handleOpen}
        className={clsx(
          'group flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 pe-11 text-start shadow-lg shadow-neutral-900/10',
          'transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-white',
          'dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-black/30 dark:hover:border-teal-900/80 dark:focus:ring-offset-neutral-950',
        )}
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300"
          aria-hidden
        >
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {a.title}
          </span>
          <span className="mt-0.5 block text-xs leading-5 text-neutral-500 dark:text-neutral-400">
            How can I help with your trades today?
          </span>
        </span>
      </button>
      <button
        type="button"
        aria-label="Minimize TScopier Assistant launcher"
        title="Minimize"
        onClick={() => setCollapsed(true)}
        className={clsx(
          'absolute end-2.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-400',
          'transition hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-teal-500',
          'dark:hover:bg-neutral-800 dark:hover:text-neutral-200',
        )}
      >
        <Minus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}
