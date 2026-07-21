import { useQuery } from '@tanstack/react-query'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { fetchAchatCarburantStats } from '../api/achatsCarburant'
import StatsRow, { ACCENT } from './StatTile'
import { fmtInt, fmtMoneyShort } from '../charts/theme'

export default function AchatCarburantStatsCards() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['achat-carb-stats'],
    queryFn: fetchAchatCarburantStats,
  })
  return (
    <StatsRow
      loading={isLoading}
      error={isError ? error : undefined}
      onRetry={refetch}
      items={[
        { label: 'Commandes carburant', value: fmtInt(data?.total), icon: <ShoppingCartOutlined />, accent: ACCENT.neutral, hint: 'achats fournisseur' },
        { label: 'Livrées', value: fmtInt(data?.livres), icon: <CheckCircleOutlined />, accent: ACCENT.good, hint: 'réception enregistrée' },
        { label: 'En attente', value: fmtInt(data?.en_attente), icon: <ClockCircleOutlined />, accent: ACCENT.warn, hint: 'non encore livrées' },
        { label: 'Fournisseurs', value: fmtInt(data?.nb_fournisseurs), icon: <ShopOutlined />, accent: ACCENT.violet, hint: 'fournisseurs carburant' },
        { label: 'Montant facturé', value: `${fmtMoneyShort(data?.montant_total)} TND`, icon: <WalletOutlined />, accent: ACCENT.info, hint: 'total facturé' },
      ]}
    />
  )
}
