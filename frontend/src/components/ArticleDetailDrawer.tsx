import { useQuery } from '@tanstack/react-query'
import { Alert, Descriptions, Drawer, Spin, Tag } from 'antd'
import { fetchArticleDetail } from '../api/articles'
import type { ArticleDetail } from '../types'

interface Props {
  code: string | null
  open: boolean
  onClose: () => void
}

const fmt = (v: unknown) =>
  v === null || v === undefined || v === '' ? '—' : String(v).trim() || '—'
const fmtNum = (v: number | null | undefined) =>
  v == null ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(v)

export default function ArticleDetailDrawer({ code, open, onClose }: Props) {
  const { data, isLoading, error } = useQuery<ArticleDetail>({
    queryKey: ['article', code],
    queryFn: () => fetchArticleDetail(code as string),
    enabled: open && !!code,
  })

  const v = data ?? ({} as ArticleDetail)
  const stock = Number(v.qte_stock ?? 0)

  return (
    <Drawer
      title={
        <span>
          Article {fmt(v.code)}{' '}
          <Tag color={stock > 0 ? 'green' : 'red'}>
            {stock > 0 ? `En stock : ${fmtNum(stock)}` : 'En rupture'}
          </Tag>
        </span>
      }
      width={640}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : error ? (
        <Alert type="error" message="Impossible de charger l'article." />
      ) : (
        <Descriptions column={2} size="small" bordered>
          <Descriptions.Item label="Code" span={2}>{fmt(v.code)}</Descriptions.Item>
          <Descriptions.Item label="Désignation" span={2}>{fmt(v.designation)}</Descriptions.Item>
          <Descriptions.Item label="Réf. constructeur">{fmt(v.ref_constructeur)}</Descriptions.Item>
          <Descriptions.Item label="Réf. remplacement">{fmt(v.ref_remplacement)}</Descriptions.Item>
          <Descriptions.Item label="Marque">{fmt(v.marque)}</Descriptions.Item>
          <Descriptions.Item label="Type">{fmt(v.type)}</Descriptions.Item>
          <Descriptions.Item label="Genre">{fmt(v.genre)}</Descriptions.Item>
          <Descriptions.Item label="Famille">{fmt(v.famille)}</Descriptions.Item>
          <Descriptions.Item label="Sous-famille" span={2}>{fmt(v.sous_famille)}</Descriptions.Item>
          <Descriptions.Item label="Prix initial (TND)">{fmtNum(v.prix)}</Descriptions.Item>
          <Descriptions.Item label="TVA (%)">{fmt(v.tva)}</Descriptions.Item>
          <Descriptions.Item label="Quantité min.">{fmt(v.quantite_min)}</Descriptions.Item>
          <Descriptions.Item label="Quantité stock">
            <b>{fmtNum(stock)}</b>
          </Descriptions.Item>
        </Descriptions>
      )}
    </Drawer>
  )
}
