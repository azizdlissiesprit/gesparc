import { useQuery } from '@tanstack/react-query'
import { Card, Col, Row, Statistic, Skeleton } from 'antd'
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  ToolOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { fetchSinistreStats } from '../api/sinistres'

const int = (n: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR').format(Number(n ?? 0))
const money = (n: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'TND',
    maximumFractionDigits: 0,
  }).format(Number(n ?? 0))

export default function SinistreStatsCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['sinistre-stats'],
    queryFn: fetchSinistreStats,
  })

  const cards = [
    { title: 'Total sinistres', value: int(data?.total), icon: <ExclamationCircleOutlined />, color: undefined as string | undefined },
    { title: 'Ouverts', value: int(data?.ouverts), icon: <SyncOutlined />, color: '#d46b08' },
    { title: 'Clôturés', value: int(data?.clos), icon: <CheckCircleOutlined />, color: '#3f8600' },
    { title: 'Montant réparation', value: money(data?.montant_rep_total), icon: <ToolOutlined />, color: '#096dd9' },
    { title: 'Montant indemnité', value: money(data?.montant_indem_total), icon: <WalletOutlined />, color: undefined },
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
