import { useQuery } from '@tanstack/react-query'
import { CheckCircleOutlined, PhoneOutlined, ShopOutlined, StopOutlined } from '@ant-design/icons'
import { fetchFournisseurStats } from '../api/fournisseurs'
import StatsRow, { ACCENT } from './StatTile'
import { fmtInt } from '../charts/theme'

export default function FournisseurStatsCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['fournisseur-stats'],
    queryFn: fetchFournisseurStats,
  })

  return (
    <StatsRow
      loading={isLoading}
      items={[
        { label: 'Total fournisseurs', value: fmtInt(data?.total), icon: <ShopOutlined />, accent: ACCENT.neutral, hint: 'référencés' },
        { label: 'Actifs', value: fmtInt(data?.actifs), icon: <CheckCircleOutlined />, accent: ACCENT.good, hint: 'peuvent être commandés' },
        { label: 'Bloqués', value: fmtInt(data?.bloques), icon: <StopOutlined />, accent: ACCENT.bad, hint: 'commandes suspendues' },
        { label: 'Avec téléphone', value: fmtInt(data?.avec_tel), icon: <PhoneOutlined />, accent: ACCENT.violet, hint: 'contact renseigné' },
      ]}
    />
  )
}
