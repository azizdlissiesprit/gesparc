import { useQuery } from '@tanstack/react-query'
import {
  CarOutlined,
  CheckCircleOutlined,
  SwapOutlined,
  SyncOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { fetchEmpruntStats } from '../api/emprunts'
import StatsRow, { ACCENT } from './StatTile'
import { fmtInt } from '../charts/theme'

export default function EmpruntStatsCards() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['emprunt-stats'],
    queryFn: fetchEmpruntStats,
  })
  return (
    <StatsRow
      loading={isLoading}
      error={isError ? error : undefined}
      onRetry={refetch}
      items={[
        { label: 'Total emprunts', value: fmtInt(data?.total), icon: <SwapOutlined />, accent: ACCENT.neutral, hint: 'véhicules prêtés' },
        { label: 'En cours', value: fmtInt(data?.en_cours), icon: <SyncOutlined />, accent: ACCENT.warn, hint: 'non retournés' },
        { label: 'Retournés', value: fmtInt(data?.retournes), icon: <CheckCircleOutlined />, accent: ACCENT.good, hint: 'prêts clôturés' },
        { label: 'Véhicules', value: fmtInt(data?.vehicules), icon: <CarOutlined />, accent: ACCENT.info, hint: 'véhicules concernés' },
        { label: 'Bénéficiaires', value: fmtInt(data?.beneficiaires), icon: <TeamOutlined />, accent: ACCENT.violet, hint: 'entités emprunteuses' },
      ]}
    />
  )
}
