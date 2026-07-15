import { useQuery } from '@tanstack/react-query'
import { Card, Col, Row, Statistic, Skeleton } from 'antd'
import {
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { fetchDemandeStats } from '../api/demandes'

const int = (n: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR').format(Number(n ?? 0))

export default function DemandeStatsCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['demande-stats'],
    queryFn: fetchDemandeStats,
  })

  const cards = [
    { title: 'Total demandes', value: data?.total, icon: <FileTextOutlined />, color: undefined as string | undefined },
    { title: 'Finis', value: data?.finis, icon: <CheckCircleOutlined />, color: '#3f8600' },
    { title: 'En attente', value: data?.en_attente, icon: <ClockCircleOutlined />, color: '#d46b08' },
    { title: 'Refusés', value: data?.refuses, icon: <CloseCircleOutlined />, color: '#cf1322' },
    { title: 'Véhicules concernés', value: data?.vehicules, icon: <CarOutlined />, color: undefined },
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
