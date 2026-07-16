import { useQuery } from '@tanstack/react-query'
import { Alert, Descriptions, Drawer, Spin, Tag } from 'antd'
import dayjs from 'dayjs'
import { fetchSinistreDetail } from '../api/sinistres'
import type { SinistreDetail } from '../types'

interface Props {
  numSin: string | null
  open: boolean
  onClose: () => void
}

const fmt = (v: unknown) =>
  v === null || v === undefined || String(v).trim() === '' ? '—' : String(v).trim()
const fmtDate = (v: unknown) =>
  v ? (dayjs(v as string).isValid() ? dayjs(v as string).format('DD/MM/YYYY') : String(v)) : '—'
const fmtMoney = (v: number | null | undefined) =>
  v == null ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(v)
const bidi = (v: unknown) => <span dir="auto">{fmt(v)}</span>

export default function SinistreDetailDrawer({ numSin, open, onClose }: Props) {
  const { data, isLoading, error } = useQuery<SinistreDetail>({
    queryKey: ['sinistre', numSin],
    queryFn: () => fetchSinistreDetail(numSin as string),
    enabled: open && !!numSin,
  })

  const v = data ?? ({} as SinistreDetail)

  return (
    <Drawer
      title={
        <span>
          Sinistre {fmt(v.num_sin)}{' '}
          {v.statut && (
            <Tag color={v.statut_code === 'ouvert' ? 'orange' : 'green'}>{v.statut}</Tag>
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
        <Alert type="error" message="Impossible de charger le sinistre." />
      ) : (
        <Descriptions column={2} size="small" bordered>
          <Descriptions.Item label="Véhicule">{fmt(v.num_plaque)}</Descriptions.Item>
          <Descriptions.Item label="Nature">{fmt(v.nature)}</Descriptions.Item>
          <Descriptions.Item label="Structure" span={2}>{bidi(v.structure)}</Descriptions.Item>
          <Descriptions.Item label="Cause">{fmt(v.cause)}</Descriptions.Item>
          <Descriptions.Item label="Date sinistre">{fmtDate(v.date_sinistre)}</Descriptions.Item>
          <Descriptions.Item label="Lieu" span={2}>{bidi(v.lieu_sinistre)}</Descriptions.Item>
          <Descriptions.Item label="Tiers">{bidi(v.tiers)}</Descriptions.Item>
          <Descriptions.Item label="Assurance tiers">{bidi(v.assurance_tiers)}</Descriptions.Item>
          <Descriptions.Item label="Adresse tiers" span={2}>{bidi(v.adresse_tiers)}</Descriptions.Item>
          <Descriptions.Item label="Expert" span={2}>{fmt(v.expert)}</Descriptions.Item>
          <Descriptions.Item label="Date expertise">{fmtDate(v.date_expertise)}</Descriptions.Item>
          <Descriptions.Item label="Date ré-expertise">{fmtDate(v.date_reexpertise)}</Descriptions.Item>
          <Descriptions.Item label="Date notification">{fmtDate(v.date_notif)}</Descriptions.Item>
          <Descriptions.Item label="Date fin">{fmtDate(v.date_fin)}</Descriptions.Item>
          <Descriptions.Item label="Montant réparation">{fmtMoney(v.montant_rep)}</Descriptions.Item>
          <Descriptions.Item label="Montant indemnité">{fmtMoney(v.montant_indem)}</Descriptions.Item>
          <Descriptions.Item label="Observation" span={2}>{bidi(v.observation)}</Descriptions.Item>
        </Descriptions>
      )}
    </Drawer>
  )
}
