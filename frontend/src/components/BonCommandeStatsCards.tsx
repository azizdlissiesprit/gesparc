import { useQuery } from '@tanstack/react-query'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { fetchBonCommandeStats } from '../api/bonsCommande'
import StatsRow, { ACCENT } from './StatTile'
import { fmtInt, fmtMoneyShort } from '../charts/theme'

export default function BonCommandeStatsCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['bc-stats'],
    queryFn: fetchBonCommandeStats,
  })

  return (
    <StatsRow
      loading={isLoading}
      items={[
        { label: 'Total commandes', value: fmtInt(data?.total), icon: <ShoppingCartOutlined />, accent: ACCENT.neutral, hint: 'bons de commande' },
        { label: 'Réceptionnées', value: fmtInt(data?.receptionnes), icon: <CheckCircleOutlined />, accent: ACCENT.good, hint: 'livraison enregistrée' },
        { label: 'En attente', value: fmtInt(data?.en_attente), icon: <ClockCircleOutlined />, accent: ACCENT.warn, hint: 'non encore livrées' },
        { label: 'Fournisseurs', value: fmtInt(data?.nb_fournisseurs), icon: <ShopOutlined />, accent: ACCENT.violet, hint: 'fournisseurs sollicités' },
        { label: 'Montant total', value: `${fmtMoneyShort(data?.montant_total)} TND`, icon: <WalletOutlined />, accent: ACCENT.info, hint: 'valeur commandée' },
      ]}
    />
  )
}
