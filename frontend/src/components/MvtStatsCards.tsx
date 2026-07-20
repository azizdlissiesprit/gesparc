import { useQuery } from '@tanstack/react-query'
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DatabaseOutlined,
  SwapOutlined,
  TagsOutlined,
} from '@ant-design/icons'
import { fetchMouvementStats } from '../api/mouvements'
import StatsRow, { ACCENT } from './StatTile'
import { fmtInt } from '../charts/theme'

export default function MvtStatsCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['mvt-stats'],
    queryFn: fetchMouvementStats,
  })

  return (
    <StatsRow
      loading={isLoading}
      items={[
        { label: 'Mouvements', value: fmtInt(data?.total), icon: <DatabaseOutlined />, accent: ACCENT.neutral, hint: "lignes d'article" },
        { label: 'Entrées', value: fmtInt(data?.entrees), icon: <ArrowDownOutlined />, accent: ACCENT.good, hint: 'réceptions en stock' },
        { label: 'Sorties', value: fmtInt(data?.sorties), icon: <ArrowUpOutlined />, accent: ACCENT.bad, hint: 'pièces consommées' },
        { label: 'Régularisations', value: fmtInt(data?.regularisations), icon: <SwapOutlined />, accent: ACCENT.info, hint: 'ajustements d’inventaire' },
        { label: 'Articles concernés', value: fmtInt(data?.nb_articles), icon: <TagsOutlined />, accent: ACCENT.violet, hint: 'références mouvementées' },
      ]}
    />
  )
}
