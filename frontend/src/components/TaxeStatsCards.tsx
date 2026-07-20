import { useQuery } from '@tanstack/react-query'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  FileDoneOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { fetchTaxeStats } from '../api/taxes'
import StatsRow, { ACCENT } from './StatTile'
import { fmtInt, fmtMoneyShort } from '../charts/theme'

export default function TaxeStatsCards() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['taxe-stats'],
    queryFn: fetchTaxeStats,
  })

  return (
    <StatsRow
      loading={isLoading}
      error={isError ? error : undefined}
      onRetry={refetch}
      items={[
        { label: 'Total taxes', value: fmtInt(data?.total), icon: <FileDoneOutlined />, accent: ACCENT.neutral, hint: 'vignettes et taxes' },
        { label: 'Valides', value: fmtInt(data?.valides), icon: <CheckCircleOutlined />, accent: ACCENT.good, hint: 'à jour' },
        { label: 'Expire bientôt', value: fmtInt(data?.bientot), icon: <ClockCircleOutlined />, accent: ACCENT.warn, hint: 'sous 30 jours' },
        { label: 'Expirées', value: fmtInt(data?.expirees), icon: <CloseCircleOutlined />, accent: ACCENT.bad, hint: 'à régulariser' },
        { label: 'Montant total', value: `${fmtMoneyShort(data?.montant_total)} TND`, icon: <WalletOutlined />, accent: ACCENT.info, hint: 'taxes acquittées' },
      ]}
    />
  )
}
