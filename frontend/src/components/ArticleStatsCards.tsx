import { useQuery } from '@tanstack/react-query'
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  StopOutlined,
  TagsOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { fetchArticleStats } from '../api/articles'
import StatsRow, { ACCENT } from './StatTile'
import { fmtInt, fmtMoneyShort } from '../charts/theme'

export default function ArticleStatsCards() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['article-stats'],
    queryFn: fetchArticleStats,
  })

  return (
    <StatsRow
      loading={isLoading}
      error={isError ? error : undefined}
      onRetry={refetch}
      items={[
        { label: 'Total articles', value: fmtInt(data?.total), icon: <AppstoreOutlined />, accent: ACCENT.neutral, hint: 'références au catalogue' },
        { label: 'En stock', value: fmtInt(data?.en_stock), icon: <CheckCircleOutlined />, accent: ACCENT.good, hint: 'quantité disponible' },
        { label: 'En rupture', value: fmtInt(data?.rupture), icon: <StopOutlined />, accent: ACCENT.bad, hint: 'à réapprovisionner' },
        { label: 'Marques', value: fmtInt(data?.nb_marques), icon: <TagsOutlined />, accent: ACCENT.violet, hint: 'marques couvertes' },
        { label: 'Valeur du stock', value: `${fmtMoneyShort(data?.valeur_stock)} TND`, icon: <WalletOutlined />, accent: ACCENT.info, hint: 'valorisation totale' },
      ]}
    />
  )
}
