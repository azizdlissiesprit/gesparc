import { useQuery } from '@tanstack/react-query'
import { Alert, Descriptions, Drawer, Spin, Tag } from 'antd'
import dayjs from 'dayjs'
import { fetchOrdreMissionDetail } from '../api/ordresMission'
import type { OrdreMissionDetail } from '../types'

interface Props {
  numOm: number | null
  open: boolean
  onClose: () => void
}

const fmt = (v: unknown) =>
  v === null || v === undefined || v === '' ? '—' : String(v)
const fmtDate = (v: unknown) =>
  v ? (dayjs(v as string).isValid() ? dayjs(v as string).format('DD/MM/YYYY') : String(v)) : '—'
const fmtNum = (v: number | null | undefined) =>
  v == null ? '—' : new Intl.NumberFormat('fr-FR').format(v)
// bidi-aware span so Arabic values render right-to-left.
const bidi = (v: unknown) => <span dir="auto">{fmt(v)}</span>

export default function OrdreMissionDetailDrawer({ numOm, open, onClose }: Props) {
  const { data, isLoading, error } = useQuery<OrdreMissionDetail>({
    queryKey: ['ordre-mission', numOm],
    queryFn: () => fetchOrdreMissionDetail(numOm as number),
    enabled: open && numOm != null,
  })

  const v = data ?? ({} as OrdreMissionDetail)

  return (
    <Drawer
      title={
        <span>
          Ordre de mission N° {fmt(v.num_om)}{' '}
          {v.statut && (
            <Tag color={v.statut_code === 'en_cours' ? 'orange' : 'green'}>{v.statut}</Tag>
          )}
        </span>
      }
      width={720}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : error ? (
        <Alert type="error" message="Impossible de charger l'ordre de mission." />
      ) : (
        <Descriptions column={2} size="small" bordered>
          <Descriptions.Item label="Véhicule">{fmt(v.num_plaque)}</Descriptions.Item>
          <Descriptions.Item label="Conducteur">{fmt(v.conducteur)}</Descriptions.Item>
          <Descriptions.Item label="Structure" span={2}>{bidi(v.structure)}</Descriptions.Item>
          <Descriptions.Item label="Destination" span={2}>{bidi(v.destination)}</Descriptions.Item>
          <Descriptions.Item label="Objectif" span={2}>{bidi(v.objectif)}</Descriptions.Item>
          <Descriptions.Item label="Produits transportés" span={2}>{bidi(v.produits_transp)}</Descriptions.Item>
          <Descriptions.Item label="Lieu de départ" span={2}>{bidi(v.lieu_depart)}</Descriptions.Item>
          <Descriptions.Item label="Date OM">{fmtDate(v.date_om)}</Descriptions.Item>
          <Descriptions.Item label="Date départ">{fmtDate(v.date_depart)}</Descriptions.Item>
          <Descriptions.Item label="Date fin">{fmtDate(v.date_fin)}</Descriptions.Item>
          <Descriptions.Item label="Validité">
            {fmtDate(v.date_debut_validite)} → {fmtDate(v.date_fin_validite)}
          </Descriptions.Item>
          <Descriptions.Item label="KM départ">{fmtNum(v.km_depart)}</Descriptions.Item>
          <Descriptions.Item label="KM retour">{fmtNum(v.km_retour)}</Descriptions.Item>
          <Descriptions.Item label="Distance (km)" span={2}>
            <b>{v.distance != null ? fmtNum(v.distance) : '—'}</b>
          </Descriptions.Item>
        </Descriptions>
      )}
    </Drawer>
  )
}
