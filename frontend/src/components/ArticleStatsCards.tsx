import { useQuery } from '@tanstack/react-query'
import { Card, Col, Row, Statistic, Skeleton } from 'antd'
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  StopOutlined,
  TagsOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { fetchArticleStats } from '../api/articles'

const int = (n: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR').format(Number(n ?? 0))
const money = (n: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'TND',
    maximumFractionDigits: 0,
  }).format(Number(n ?? 0))

export default function ArticleStatsCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['article-stats'],
    queryFn: fetchArticleStats,
  })

  const cards = [
    { title: 'Total articles', value: int(data?.total), icon: <AppstoreOutlined />, color: undefined as string | undefined },
    { title: 'En stock', value: int(data?.en_stock), icon: <CheckCircleOutlined />, color: '#3f8600' },
    { title: 'En rupture', value: int(data?.rupture), icon: <StopOutlined />, color: '#cf1322' },
    { title: 'Marques', value: int(data?.nb_marques), icon: <TagsOutlined />, color: undefined },
    { title: 'Valeur du stock', value: money(data?.valeur_stock), icon: <WalletOutlined />, color: '#096dd9' },
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
