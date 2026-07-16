import { useQuery } from '@tanstack/react-query'
import { Card, Col, Row, Statistic, Skeleton } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { fetchBonCommandeStats } from '../api/bonsCommande'

const int = (n: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR').format(Number(n ?? 0))
const money = (n: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'TND',
    maximumFractionDigits: 0,
  }).format(Number(n ?? 0))

export default function BonCommandeStatsCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['bc-stats'],
    queryFn: fetchBonCommandeStats,
  })

  const cards = [
    { title: 'Total commandes', value: int(data?.total), icon: <ShoppingCartOutlined />, color: undefined as string | undefined },
    { title: 'Réceptionnées', value: int(data?.receptionnes), icon: <CheckCircleOutlined />, color: '#3f8600' },
    { title: 'En attente', value: int(data?.en_attente), icon: <ClockCircleOutlined />, color: '#d46b08' },
    { title: 'Fournisseurs', value: int(data?.nb_fournisseurs), icon: <ShopOutlined />, color: undefined },
    { title: 'Montant total', value: money(data?.montant_total), icon: <WalletOutlined />, color: '#096dd9' },
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
