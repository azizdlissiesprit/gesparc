import { useQuery } from '@tanstack/react-query'
import { Card, Col, Row, Statistic, Skeleton } from 'antd'
import {
  CalendarOutlined,
  CarOutlined,
  DatabaseOutlined,
  DollarOutlined,
  FireOutlined,
} from '@ant-design/icons'
import { fetchCarburantStats } from '../api/carburant'

const int = (n: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR').format(Number(n ?? 0))
const compact = (n: number | null | undefined) => {
  const v = Number(n ?? 0)
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M`
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)} k`
  return int(v)
}

export default function CarburantStatsCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['carburant-stats'],
    queryFn: fetchCarburantStats,
  })

  const cards = [
    { title: 'Transactions', value: int(data?.total), icon: <DatabaseOutlined />, color: undefined as string | undefined },
    { title: 'Litres distribués', value: compact(data?.litres_total), icon: <FireOutlined />, color: '#d46b08' },
    { title: 'Montant total (TND)', value: compact(data?.montant_total), icon: <DollarOutlined />, color: '#389e0d' },
    { title: 'Véhicules', value: int(data?.vehicules), icon: <CarOutlined />, color: undefined },
    { title: 'Années couvertes', value: int(data?.annees), icon: <CalendarOutlined />, color: undefined },
  ]

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      {cards.map((c) => (
        <Col xs={24} sm={12} md={8} lg={5} xl={5} key={c.title} style={{ flex: 1 }}>
          <Card>
            {isLoading ? (
              <Skeleton active paragraph={false} />
            ) : (
              <Statistic
                title={c.title}
                value={c.value}
                prefix={c.icon}
                valueStyle={c.color ? { color: c.color } : undefined}
              />
            )}
          </Card>
        </Col>
      ))}
    </Row>
  )
}
