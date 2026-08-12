import { useAuth } from '@/context/AuthContext'
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'
import { HomeBrokersSection } from '@/components/home/HomeBrokersSection'
import { AppScreen } from '@/components/layout/AppScreen'

export default function BrokersScreen() {
  const { user } = useAuth()
  const metrics = useDashboardMetrics(user?.id)

  return (
    <AppScreen>
      <HomeBrokersSection metrics={metrics} />
    </AppScreen>
  )
}
