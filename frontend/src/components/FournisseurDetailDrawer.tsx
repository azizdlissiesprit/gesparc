import { useQuery } from '@tanstack/react-query'
import { Alert, Descriptions, Drawer, Spin, Tag } from 'antd'
import dayjs from 'dayjs'
import { fetchFournisseurDetail } from '../api/fournisseurs'
import type { FournisseurDetail } from '../types'

interface Props {
  code: string | null
  open: boolean
  onClose: () => void
}

const fmt = (v: unknown) =>
  v === null || v === undefined || String(v).trim() === '' ? '—' : String(v).trim()
const fmtDate = (v: unknown) =>
  v ? (dayjs(v as string).isValid() ? dayjs(v as string).format('DD/MM/YYYY') : String(v)) : '—'

export default function FournisseurDetailDrawer({ code, open, onClose }: Props) {
  const { data, isLoading, error } = useQuery<FournisseurDetail>({
    queryKey: ['fournisseur', code],
    queryFn: () => fetchFournisseurDetail(code as string),
    enabled: open && !!code,
  })

  const v = data ?? ({} as FournisseurDetail)

  return (
    <Drawer
      title={
        <span>
          Fournisseur {fmt(v.code)}{' '}
          {v.statut && (
            <Tag color={v.bloque ? 'red' : 'green'}>{v.statut}</Tag>
          )}
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
        <Alert type="error" message="Impossible de charger le fournisseur." />
      ) : (
        <Descriptions column={2} size="small" bordered>
          <Descriptions.Item label="Code">{fmt(v.code)}</Descriptions.Item>
          <Descriptions.Item label="Désignation">{fmt(v.designation)}</Descriptions.Item>
          <Descriptions.Item label="Raison sociale" span={2}>{fmt(v.raison_sociale)}</Descriptions.Item>
          <Descriptions.Item label="Activité" span={2}>{fmt(v.activite)}</Descriptions.Item>
          <Descriptions.Item label="Adresse" span={2}>{fmt(v.adresse)}</Descriptions.Item>
          <Descriptions.Item label="Téléphone">{fmt(v.tel)}</Descriptions.Item>
          <Descriptions.Item label="Fax">{fmt(v.fax)}</Descriptions.Item>
          <Descriptions.Item label="Email">{fmt(v.email)}</Descriptions.Item>
          <Descriptions.Item label="Web">{fmt(v.web)}</Descriptions.Item>
          <Descriptions.Item label="Matricule fiscale">{fmt(v.mat_fisc)}</Descriptions.Item>
          <Descriptions.Item label="Date création">{fmtDate(v.date_creation)}</Descriptions.Item>
          <Descriptions.Item label="Banque">{fmt(v.bank)}</Descriptions.Item>
          <Descriptions.Item label="RIB">{fmt(v.rib)}</Descriptions.Item>
        </Descriptions>
      )}
    </Drawer>
  )
}
