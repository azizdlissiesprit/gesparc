import { useQuery } from '@tanstack/react-query'
import {
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { fetchDemandeStats } from '../api/demandes'
import StatsRow, { ACCENT } from './StatTile'
import { fmtInt } from '../charts/theme'

export default function DemandeStatsCards() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['demande-stats'],
    queryFn: fetchDemandeStats,
  })

  return (
    <StatsRow
      loading={isLoading}
      error={isError ? error : undefined}
      onRetry={refetch}
      items={[
        { label: 'Total demandes', value: fmtInt(data?.total), icon: <FileTextOutlined />, accent: ACCENT.neutral, hint: "demandes d'intervention" },
        { label: 'Finis', value: fmtInt(data?.finis), icon: <CheckCircleOutlined />, accent: ACCENT.good, hint: 'traitées' },
        { label: 'En attente', value: fmtInt(data?.en_attente), icon: <ClockCircleOutlined />, accent: ACCENT.warn, hint: 'à traiter' },
        { label: 'Refusés', value: fmtInt(data?.refuses), icon: <CloseCircleOutlined />, accent: ACCENT.bad, hint: 'non retenues' },
        { label: 'Véhicules concernés', value: fmtInt(data?.vehicules), icon: <CarOutlined />, accent: ACCENT.violet, hint: 'parc touché' },
      ]}
    />
  )
}
