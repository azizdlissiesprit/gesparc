import { useQuery } from '@tanstack/react-query'
import { Card, Col, Row, Statistic, Skeleton } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  FileDoneOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { fetchTaxeStats } from '../api/taxes'

const money = (n: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'TND',
    maximumFractionDigits: 0,
  }).format(Number(n ?? 0))

export default function TaxeStatsCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['taxe-stats'],
    queryFn: fetchTaxeStats,
  })

  const cards = [
    {
      title: 'Total taxes',
      value: data?.total ?? 0,
      icon: <FileDoneOutlined />,
      color: undefined as string | undefined,
    },
    {
      title: 'Valides',
      value: data?.valides ?? 0,
      icon: <CheckCircleOutlined />,
      color: '#3f8600',
    },
    {
      title: 'Expire bientôt',
      value: data?.bientot ?? 0,
      icon: <ClockCircleOutlined />,
      color: '#d46b08',
    },
    {
      title: 'Expirées',
      value: data?.expirees ?? 0,
      icon: <CloseCircleOutlined />,
      color: '#cf1322',
    },
  ]

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      {cards.map((c) => (
        <Col xs={24} sm={12} md={12} lg={5} xl={5} key={c.title}>
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
      <Col xs={24} sm={12} md={12} lg={4} xl={4}>
        <Card>
          {isLoading ? (
            <Skeleton active paragraph={false} />
          ) : (
            <Statistic
              title="Montant total"
              value={money(data?.montant_total)}
              prefix={<WalletOutlined />}
            />
          )}
        </Card>
      </Col>
    </Row>
  )
}
