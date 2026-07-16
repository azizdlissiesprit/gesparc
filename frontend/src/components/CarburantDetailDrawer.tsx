import { Descriptions, Drawer, Tag } from 'antd'
import type { LigneCarburant } from '../types'
import { categorieTag } from '../utils/categorie'

interface Props {
  data: LigneCarburant | null
  open: boolean
  onClose: () => void
}

const fmt = (v: unknown) =>
  v === null || v === undefined || String(v).trim() === '' ? '—' : String(v).trim()
const num = (v: number | null | undefined, digits = 3) =>
  v == null ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(v)
const date = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleDateString('fr-FR') : '—'

export default function CarburantDetailDrawer({ data, open, onClose }: Props) {
  const v = data ?? ({} as LigneCarburant)
  const cat = categorieTag(v.categorie)
  return (
    <Drawer
      title={
        <span>
          Carburant — {fmt(v.num_plaque ?? v.num_struct)}{' '}
          {v.categorie && <Tag color={cat.color}>{cat.label}</Tag>}
        </span>
      }
      width={680}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      <Descriptions column={2} size="small" bordered>
        <Descriptions.Item label="N° ligne" span={2}>{fmt(v.num_ligne_carb)}</Descriptions.Item>
        <Descriptions.Item label="Date">{date(v.date_piece)}</Descriptions.Item>
        <Descriptions.Item label="Type">{fmt(v.type)}</Descriptions.Item>
        <Descriptions.Item label="Véhicule">{fmt(v.num_plaque)}</Descriptions.Item>
        <Descriptions.Item label="Énergie">{fmt(v.energie)}</Descriptions.Item>
        <Descriptions.Item label="Structure" span={2}>
          <span dir="auto">{fmt(v.structure)}</span>
        </Descriptions.Item>
        <Descriptions.Item label="Bénéficiaire" span={2}>{fmt(v.beneficiaire)}</Descriptions.Item>
        <Descriptions.Item label="Quantité (L)">{num(v.quantite)}</Descriptions.Item>
        <Descriptions.Item label="Prix unitaire (TND)">{num(v.prix_unitaire)}</Descriptions.Item>
        <Descriptions.Item label="Montant (TND)" span={2}>
          <b>{num(v.montant)}</b>
        </Descriptions.Item>
        <Descriptions.Item label="Index KM">{num(v.index_km, 0)}</Descriptions.Item>
        <Descriptions.Item label="Réf. BC">{fmt(v.ref_bc)}</Descriptions.Item>
      </Descriptions>
    </Drawer>
  )
}
