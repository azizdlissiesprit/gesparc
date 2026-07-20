import { useQuery } from '@tanstack/react-query'
import { HomeOutlined, ShopOutlined, ToolOutlined, WalletOutlined } from '@ant-design/icons'
import { fetchBonTravailStats } from '../api/bonsTravail'
import StatsRow, { ACCENT } from './StatTile'
import { fmtInt, fmtMoneyShort } from '../charts/theme'

export default function BonTravailStatsCards() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['bt-stats'],
    queryFn: fetchBonTravailStats,
  })

  return (
    <StatsRow
      loading={isLoading}
      error={isError ? error : undefined}
      onRetry={refetch}
      items={[
        { label: 'Total bons de travail', value: fmtInt(data?.total), icon: <ToolOutlined />, accent: ACCENT.neutral, hint: 'interventions enregistrées' },
        { label: 'Interne', value: fmtInt(data?.internes), icon: <HomeOutlined />, accent: ACCENT.info, hint: 'réalisées en atelier' },
        { label: 'Externe', value: fmtInt(data?.externes), icon: <ShopOutlined />, accent: ACCENT.warn, hint: 'sous-traitées' },
        { label: 'Coût total', value: `${fmtMoneyShort(data?.cout_total)} TND`, icon: <WalletOutlined />, accent: ACCENT.good, hint: 'pièces + main d’œuvre' },
      ]}
    />
  )
}
