import { useQuery } from '@tanstack/react-query'
import { Descriptions, Drawer, Skeleton, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { fetchAchatCarburantDetail } from '../api/achatsCarburant'
import type { AchatCarburantLigne } from '../types'

const { Title } = Typography
const d = (v: string | null | undefined) => (v ? dayjs(v).format('DD/MM/YYYY') : '—')
const n = (v: number | null | undefined, digits = 3) =>
  v == null ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(v)

export default function AchatCarburantDetailDrawer({
  reference,
  open,
  onClose,
}: {
  reference: string | null
  open: boolean
  onClose: () => void
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['achat-carb-detail', reference],
    queryFn: () => fetchAchatCarburantDetail(reference as string),
    enabled: open && !!reference,
  })

  const cols: ColumnsType<AchatCarburantLigne> = [
    { title: 'Article', dataIndex: 'code', key: 'code', width: 90 },
    { title: 'Désignation', dataIndex: 'designation', key: 'designation', ellipsis: true },
    { title: 'Énergie', dataIndex: 'energie', key: 'energie', width: 110, render: (v) => (v ? String(v).trim() : '—') },
    { title: 'Qté cmd', dataIndex: 'quantite', key: 'quantite', width: 90, align: 'right', render: (v) => n(v, 2) },
    { title: 'Qté livrée', dataIndex: 'quantite_livree', key: 'quantite_livree', width: 90, align: 'right', render: (v) => n(v, 2) },
    { title: 'Prix unit.', dataIndex: 'prix_unitaire', key: 'prix_unitaire', width: 90, align: 'right', render: (v) => n(v, 3) },
    { title: 'Montant TTC', dataIndex: 'montant_ttc', key: 'montant_ttc', width: 120, align: 'right', render: (v) => n(v, 3) },
  ]

  return (
    <Drawer
      title={<span>Achat carburant — {reference}</span>}
      width={760}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      {isLoading || !data ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <>
          <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Fournisseur" span={2}>
              <span dir="auto">{data.fournisseur ?? '—'}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Parc / UGP" span={2}>
              <span dir="auto">{data.parc ?? '—'}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Marché">{data.num_marche ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="Statut">
              <Tag color={data.statut_code === 'livre' ? 'green' : 'orange'}>{data.statut}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Date commande">{d(data.date_commande)}</Descriptions.Item>
            <Descriptions.Item label="Date livraison">{d(data.date_livraison)}</Descriptions.Item>
            <Descriptions.Item label="Montant commande (TTC)">{n(data.montant)}</Descriptions.Item>
            <Descriptions.Item label="Montant facturé">{n(data.montant_facture)}</Descriptions.Item>
            <Descriptions.Item label="Date facture">{d(data.date_facture)}</Descriptions.Item>
            <Descriptions.Item label="Règlement">{n(data.montant_reglement)}</Descriptions.Item>
          </Descriptions>

          <Title level={5}>Articles ({data.lignes?.length ?? 0})</Title>
          <Table<AchatCarburantLigne>
            rowKey={(_r, i) => String(i)}
            size="small"
            columns={cols}
            dataSource={data.lignes ?? []}
            pagination={false}
            scroll={{ x: 700 }}
          />
        </>
      )}
    </Drawer>
  )
}
