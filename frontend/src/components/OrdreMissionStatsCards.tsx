import { useQuery } from '@tanstack/react-query'
import { Card, Col, Row, Statistic, Skeleton } from 'antd'
import {
  CarOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  SyncOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { fetchOrdreMissionStats } from '../api/ordresMission'

const int = (n: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR').format(Number(n ?? 0))

export default function OrdreMissionStatsCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['om-stats'],
    queryFn: fetchOrdreMissionStats,
  })

  const cards = [
    { title: 'Total ordres', value: data?.total, icon: <FileTextOutlined />, color: undefined as string | undefined },
    { title: 'En cours', value: data?.en_cours, icon: <SyncOutlined />, color: '#d46b08' },
    { title: 'Terminées', value: data?.terminees, icon: <CheckCircleOutlined />, color: '#3f8600' },
    { title: 'Véhicules', value: data?.vehicules, icon: <CarOutlined />, color: undefined },
    { title: 'Conducteurs', value: data?.conducteurs, icon: <TeamOutlined />, color: undefined },
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
