import { useCallback } from 'react'
import { router } from 'expo-router'
import { WelcomeSlider } from '@/components/welcome/WelcomeSlider'
import { markWelcomeSeen } from '@/lib/welcomeSeen'

export default function WelcomeScreen() {
  const finish = useCallback((destination: 'login' | 'signup' = 'signup') => {
    void markWelcomeSeen().finally(() => {
      router.replace(destination === 'login' ? '/(auth)/login' : '/(auth)/signup')
    })
  }, [])

  return (
    <WelcomeSlider onFinished={() => finish('signup')} onSkip={() => finish('login')} />
  )
}
