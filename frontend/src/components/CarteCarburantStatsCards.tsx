import { useQuery } from '@tanstack/react-query'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CreditCardOutlined,
  ClusterOutlined,
} from '@ant-design/icons'
import { fetchCarteCarburantStats } from '../api/cartesCarburant'
import StatsRow, { ACCENT } from './StatTile'
import { fmtInt } from '../charts/theme'

export default function CarteCarburantStatsCards() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['carte-carb-stats'],
    queryFn: fetchCarteCarburantStats,
  })
  return (
    <StatsRow
      loading={isLoading}
      error={isError ? error : undefined}
      onRetry={refetch}
      items={[
        { label: 'Total cartes', value: fmtInt(data?.total), icon: <CreditCardOutlined />, accent: ACCENT.neutral, hint: "cartes d'accès" },
        { label: 'Valides', value: fmtInt(data?.valides), icon: <CheckCircleOutlined />, accent: ACCENT.good, hint: 'à jour' },
        { label: 'Expire bientôt', value: fmtInt(data?.bientot), icon: <ClockCircleOutlined />, accent: ACCENT.warn, hint: 'sous 30 jours' },
        { label: 'Expirées', value: fmtInt(data?.expirees), icon: <CloseCircleOutlined />, accent: ACCENT.bad, hint: 'à renouveler' },
        { label: 'Structures', value: fmtInt(data?.nb_structures), icon: <ClusterOutlined />, accent: ACCENT.violet, hint: 'structures dotées' },
      ]}
    />
  )
}
