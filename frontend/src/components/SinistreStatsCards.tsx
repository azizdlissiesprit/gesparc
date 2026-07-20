import { useQuery } from '@tanstack/react-query'
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  ToolOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { fetchSinistreStats } from '../api/sinistres'
import StatsRow, { ACCENT } from './StatTile'
import { fmtInt, fmtMoneyShort } from '../charts/theme'

export default function SinistreStatsCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['sinistre-stats'],
    queryFn: fetchSinistreStats,
  })

  return (
    <StatsRow
      loading={isLoading}
      items={[
        { label: 'Total sinistres', value: fmtInt(data?.total), icon: <ExclamationCircleOutlined />, accent: ACCENT.neutral, hint: 'déclarations' },
        { label: 'Ouverts', value: fmtInt(data?.ouverts), icon: <SyncOutlined />, accent: ACCENT.warn, hint: 'en cours de traitement' },
        { label: 'Clôturés', value: fmtInt(data?.clos), icon: <CheckCircleOutlined />, accent: ACCENT.good, hint: 'dossiers réglés' },
        { label: 'Montant réparation', value: `${fmtMoneyShort(data?.montant_rep_total)} TND`, icon: <ToolOutlined />, accent: ACCENT.info, hint: 'coût des remises en état' },
        { label: 'Montant indemnité', value: `${fmtMoneyShort(data?.montant_indem_total)} TND`, icon: <WalletOutlined />, accent: ACCENT.violet, hint: 'indemnisations perçues' },
      ]}
    />
  )
}
