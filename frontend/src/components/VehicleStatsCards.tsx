import { useQuery } from '@tanstack/react-query'
import {
  CarOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  StopOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import { fetchVehicleStats } from '../api/vehicles'
import StatsRow, { ACCENT } from './StatTile'
import { fmtInt } from '../charts/theme'

export default function VehicleStatsCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['vehicle-stats'],
    queryFn: fetchVehicleStats,
  })

  const countFor = (code: number) =>
    data?.by_etat.find((e) => e.etat_code === code)?.n ?? 0
  const total = data?.total ?? 0
  const pct = (n: number) => (total ? `${Math.round((n / total) * 100)} % du parc` : '—')

  return (
    <StatsRow
      loading={isLoading}
      items={[
        { label: 'Total véhicules', value: fmtInt(total), icon: <CarOutlined />, accent: ACCENT.neutral, hint: 'parc immatriculé' },
        { label: 'En circulation', value: fmtInt(countFor(1)), icon: <CheckCircleOutlined />, accent: ACCENT.good, hint: pct(countFor(1)) },
        { label: 'En réparation', value: fmtInt(countFor(2)), icon: <ToolOutlined />, accent: ACCENT.warn, hint: 'immobilisés en atelier' },
        { label: 'Réformés', value: fmtInt(countFor(5)), icon: <StopOutlined />, accent: ACCENT.violet, hint: 'retirés du service' },
        { label: 'Vendus', value: fmtInt(countFor(6)), icon: <DollarOutlined />, accent: ACCENT.info, hint: pct(countFor(6)) },
      ]}
    />
  )
}
