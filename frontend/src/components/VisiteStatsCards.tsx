import { useQuery } from '@tanstack/react-query'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  FileDoneOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { fetchVisiteStats } from '../api/visites'
import StatsRow, { ACCENT } from './StatTile'
import { fmtInt, fmtMoneyShort } from '../charts/theme'

export default function VisiteStatsCards() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['visite-stats'],
    queryFn: fetchVisiteStats,
  })

  return (
    <StatsRow
      loading={isLoading}
      error={isError ? error : undefined}
      onRetry={refetch}
      items={[
        { label: 'Total visites', value: fmtInt(data?.total), icon: <FileDoneOutlined />, accent: ACCENT.neutral, hint: 'visites enregistrées' },
        { label: 'Valides', value: fmtInt(data?.valides), icon: <CheckCircleOutlined />, accent: ACCENT.good, hint: 'à jour' },
        { label: 'Expire bientôt', value: fmtInt(data?.bientot), icon: <ClockCircleOutlined />, accent: ACCENT.warn, hint: 'sous 30 jours' },
        { label: 'Expirées', value: fmtInt(data?.expirees), icon: <CloseCircleOutlined />, accent: ACCENT.bad, hint: 'à renouveler' },
        { label: 'Montant total', value: `${fmtMoneyShort(data?.montant_total)} TND`, icon: <WalletOutlined />, accent: ACCENT.info, hint: 'coût des visites' },
      ]}
    />
  )
}
