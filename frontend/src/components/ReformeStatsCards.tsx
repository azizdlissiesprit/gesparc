import { useQuery } from '@tanstack/react-query'
import { Card, Col, Row, Statistic, Skeleton } from 'antd'
import {
  DollarOutlined,
  FileProtectOutlined,
  NumberOutlined,
  StopOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { fetchReformeStats } from '../api/reformes'

const money = (n: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'TND',
    maximumFractionDigits: 0,
  }).format(Number(n ?? 0))

export default function ReformeStatsCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['reforme-stats'],
    queryFn: fetchReformeStats,
  })

  const cards = [
    {
      title: 'Total réformes',
      value: data?.total ?? 0,
      icon: <StopOutlined />,
      color: undefined as string | undefined,
    },
    {
      title: 'Vendus',
      value: data?.vendus ?? 0,
      icon: <DollarOutlined />,
      color: '#096dd9',
    },
    {
      title: 'Non vendus',
      value: data?.non_vendus ?? 0,
      icon: <FileProtectOutlined />,
      color: '#d46b08',
    },
    {
      title: 'Références',
      value: data?.nb_references ?? 0,
      icon: <NumberOutlined />,
      color: undefined,
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
              title="Montant total ventes"
              value={money(data?.montant_total)}
              prefix={<WalletOutlined />}
            />
          )}
        </Card>
      </Col>
    </Row>
  )
}
