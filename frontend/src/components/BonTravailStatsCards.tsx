import { useQuery } from '@tanstack/react-query'
import { Card, Col, Row, Statistic, Skeleton } from 'antd'
import {
  HomeOutlined,
  ShopOutlined,
  ToolOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { fetchBonTravailStats } from '../api/bonsTravail'

const money = (n: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'TND',
    maximumFractionDigits: 0,
  }).format(Number(n ?? 0))

export default function BonTravailStatsCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['bt-stats'],
    queryFn: fetchBonTravailStats,
  })

  const cards = [
    {
      title: 'Total bons de travail',
      value: (data?.total ?? 0).toLocaleString('fr-FR'),
      icon: <ToolOutlined />,
      color: undefined as string | undefined,
    },
    {
      title: 'Interne',
      value: (data?.internes ?? 0).toLocaleString('fr-FR'),
      icon: <HomeOutlined />,
      color: '#096dd9',
    },
    {
      title: 'Externe',
      value: (data?.externes ?? 0).toLocaleString('fr-FR'),
      icon: <ShopOutlined />,
      color: '#d46b08',
    },
    {
      title: 'Coût total',
      value: money(data?.cout_total),
      icon: <WalletOutlined />,
      color: '#3f8600',
    },
  ]

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      {cards.map((c) => (
        <Col xs={24} sm={12} md={12} lg={6} xl={6} key={c.title}>
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
