import { useQuery } from '@tanstack/react-query'
import {
  DollarOutlined,
  FileProtectOutlined,
  NumberOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { fetchReformeStats } from '../api/reformes'
import StatsRow, { ACCENT } from './StatTile'
import { fmtInt, fmtMoneyShort } from '../charts/theme'

export default function ReformeStatsCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['reforme-stats'],
    queryFn: fetchReformeStats,
  })

  return (
    <StatsRow
      loading={isLoading}
      items={[
        { label: 'Total réformes', value: fmtInt(data?.total), icon: <StopOutlined />, accent: ACCENT.neutral, hint: 'véhicules réformés' },
        { label: 'Vendus', value: fmtInt(data?.vendus), icon: <DollarOutlined />, accent: ACCENT.info, hint: 'sortis des comptes' },
        { label: 'Non vendus', value: fmtInt(data?.non_vendus), icon: <FileProtectOutlined />, accent: ACCENT.warn, hint: 'en attente de cession' },
        { label: 'Références', value: fmtInt(data?.nb_references), icon: <NumberOutlined />, accent: ACCENT.violet, hint: 'dossiers de réforme' },
        { label: 'Montant total', value: `${fmtMoneyShort(data?.montant_total)} TND`, icon: <DollarOutlined />, accent: ACCENT.good, hint: 'produit des ventes' },
      ]}
    />
  )
}
