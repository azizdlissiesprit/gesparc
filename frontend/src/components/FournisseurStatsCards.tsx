import { useQuery } from '@tanstack/react-query'
import { Card, Col, Row, Statistic, Skeleton } from 'antd'
import {
  CheckCircleOutlined,
  PhoneOutlined,
  ShopOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { fetchFournisseurStats } from '../api/fournisseurs'

const int = (n: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR').format(Number(n ?? 0))

export default function FournisseurStatsCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['fournisseur-stats'],
    queryFn: fetchFournisseurStats,
  })

  const cards = [
    { title: 'Total fournisseurs', value: data?.total, icon: <ShopOutlined />, color: undefined as string | undefined },
    { title: 'Actifs', value: data?.actifs, icon: <CheckCircleOutlined />, color: '#3f8600' },
    { title: 'Bloqués', value: data?.bloques, icon: <StopOutlined />, color: '#cf1322' },
    { title: 'Avec téléphone', value: data?.avec_tel, icon: <PhoneOutlined />, color: undefined },
  ]

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      {cards.map((c) => (
        <Col xs={24} sm={12} md={6} lg={6} xl={6} key={c.title}>
          <Card>
            {isLoading ? (
              <Skeleton active paragraph={false} />
            ) : (
              <Statistic
                title={c.title}
                value={int(c.value)}
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
