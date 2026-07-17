import { useQuery } from '@tanstack/react-query'
import { Card, Col, Row, Statistic, Skeleton } from 'antd'
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DatabaseOutlined,
  SwapOutlined,
  TagsOutlined,
} from '@ant-design/icons'
import { fetchMouvementStats } from '../api/mouvements'

const int = (n: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR').format(Number(n ?? 0))

export default function MvtStatsCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['mvt-stats'],
    queryFn: fetchMouvementStats,
  })

  const cards = [
    { title: 'Mouvements', value: int(data?.total), icon: <DatabaseOutlined />, color: undefined as string | undefined },
    { title: 'Entrées', value: int(data?.entrees), icon: <ArrowDownOutlined />, color: '#3f8600' },
    { title: 'Sorties', value: int(data?.sorties), icon: <ArrowUpOutlined />, color: '#cf1322' },
    { title: 'Régularisations', value: int(data?.regularisations), icon: <SwapOutlined />, color: '#096dd9' },
    { title: 'Articles concernés', value: int(data?.nb_articles), icon: <TagsOutlined />, color: undefined },
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
