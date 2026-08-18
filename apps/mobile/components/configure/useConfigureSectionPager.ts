import { useCallback, useEffect, useRef, useState } from 'react'
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native'

/** Scroll-spy pager: one stacked document, tabs jump to sections (matches web configure modal). */
export function useConfigureSectionPager<T extends string>(sectionIds: readonly T[]) {
  const first = sectionIds[0]!
  const [activeId, setActiveId] = useState<T>(first)
  const scrollRef = useRef<ScrollView>(null)
  const tabScrollRef = useRef<ScrollView>(null)
  const sectionY = useRef<Partial<Record<T, number>>>({})
  const tabX = useRef<Partial<Record<T, number>>>({})
  const programmaticRef = useRef(false)
  const programTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearProgramTimer = () => {
    if (programTimerRef.current) {
      clearTimeout(programTimerRef.current)
      programTimerRef.current = null
    }
  }

  useEffect(() => () => clearProgramTimer(), [])

  const onSectionLayout = useCallback((id: T, y: number) => {
    sectionY.current[id] = y
  }, [])

  const onTabLayout = useCallback((id: T, x: number) => {
    tabX.current[id] = x
  }, [])

  const scrollTabIntoView = useCallback((id: T) => {
    const x = tabX.current[id]
    if (x == null) return
    tabScrollRef.current?.scrollTo({ x: Math.max(0, x - 24), animated: true })
  }, [])

  const scrollToSection = useCallback((id: T) => {
    programmaticRef.current = true
    clearProgramTimer()
    setActiveId(id)
    const y = sectionY.current[id] ?? 0
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true })
    scrollTabIntoView(id)
    programTimerRef.current = setTimeout(() => {
      programmaticRef.current = false
      programTimerRef.current = null
    }, 650)
  }, [scrollTabIntoView])

  const onBodyScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (programmaticRef.current) return
    const y = e.nativeEvent.contentOffset.y
    let current = sectionIds[0]!
    for (const id of sectionIds) {
      const top = sectionY.current[id]
      if (top != null && top - 40 <= y) current = id
    }
    setActiveId(prev => (prev === current ? prev : current))
  }, [sectionIds])

  useEffect(() => {
    if (programmaticRef.current) return
    scrollTabIntoView(activeId)
  }, [activeId, scrollTabIntoView])

  const resetTo = useCallback((id: T = first) => {
    programmaticRef.current = true
    clearProgramTimer()
    setActiveId(id)
    scrollRef.current?.scrollTo({ y: 0, animated: false })
    tabScrollRef.current?.scrollTo({ x: 0, animated: false })
    programTimerRef.current = setTimeout(() => {
      programmaticRef.current = false
      programTimerRef.current = null
    }, 200)
  }, [first])

  return {
    activeId,
    scrollRef,
    tabScrollRef,
    onSectionLayout,
    onTabLayout,
    scrollToSection,
    onBodyScroll,
    resetTo,
  }
}
