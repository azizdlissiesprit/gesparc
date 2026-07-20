import { useQuery } from '@tanstack/react-query'
import {
  CalendarOutlined,
  CarOutlined,
  DatabaseOutlined,
  DollarOutlined,
  FireOutlined,
} from '@ant-design/icons'
import { fetchCarburantStats } from '../api/carburant'
import StatsRow, { ACCENT } from './StatTile'
import { fmtInt, fmtMoneyShort } from '../charts/theme'

export default function CarburantStatsCards() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['carburant-stats'],
    queryFn: fetchCarburantStats,
  })

  return (
    <StatsRow
      loading={isLoading}
      error={isError ? error : undefined}
      onRetry={refetch}
      items={[
        { label: 'Transactions', value: fmtInt(data?.total), icon: <DatabaseOutlined />, accent: ACCENT.neutral, hint: 'lignes de distribution' },
        { label: 'Litres distribués', value: fmtMoneyShort(data?.litres_total), icon: <FireOutlined />, accent: ACCENT.warn, hint: 'volume cumulé' },
        { label: 'Montant total', value: `${fmtMoneyShort(data?.montant_total)} TND`, icon: <DollarOutlined />, accent: ACCENT.good, hint: 'dépense carburant' },
        { label: 'Véhicules', value: fmtInt(data?.vehicules), icon: <CarOutlined />, accent: ACCENT.info, hint: 'véhicules servis' },
        { label: 'Années couvertes', value: fmtInt(data?.annees), icon: <CalendarOutlined />, accent: ACCENT.violet, hint: 'profondeur historique' },
      ]}
    />
  )
}
