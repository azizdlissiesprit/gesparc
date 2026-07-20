import { useQuery } from '@tanstack/react-query'
import {
  CarOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  SyncOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { fetchOrdreMissionStats } from '../api/ordresMission'
import StatsRow, { ACCENT } from './StatTile'
import { fmtInt } from '../charts/theme'

export default function OrdreMissionStatsCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['om-stats'],
    queryFn: fetchOrdreMissionStats,
  })

  return (
    <StatsRow
      loading={isLoading}
      items={[
        { label: 'Total ordres', value: fmtInt(data?.total), icon: <FileTextOutlined />, accent: ACCENT.neutral, hint: 'ordres de mission' },
        { label: 'En cours', value: fmtInt(data?.en_cours), icon: <SyncOutlined />, accent: ACCENT.warn, hint: 'non clôturées' },
        { label: 'Terminées', value: fmtInt(data?.terminees), icon: <CheckCircleOutlined />, accent: ACCENT.good, hint: 'missions achevées' },
        { label: 'Véhicules', value: fmtInt(data?.vehicules), icon: <CarOutlined />, accent: ACCENT.info, hint: 'véhicules mobilisés' },
        { label: 'Conducteurs', value: fmtInt(data?.conducteurs), icon: <TeamOutlined />, accent: ACCENT.violet, hint: 'agents concernés' },
      ]}
    />
  )
}
