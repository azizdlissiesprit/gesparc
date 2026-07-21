import { useQuery } from '@tanstack/react-query'
import { Alert, Descriptions, Drawer, Spin, Table, Tabs, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { fetchBonTravailDetail } from '../api/bonsTravail'
import type {
  BonTravailDetail,
  BonTravailOperation,
  BonTravailPieceExterne,
} from '../types'

interface Props {
  reference: string | null
  open: boolean
  onClose: () => void
}

const fmt = (v: unknown) =>
  v === null || v === undefined || v === '' ? '—' : String(v)
const fmtDate = (v: unknown) =>
  v ? (dayjs(v as string).isValid() ? dayjs(v as string).format('DD/MM/YYYY') : String(v)) : '—'
const fmtMoney = (v: number | null | undefined) =>
  v == null ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(v)

const opColumns: ColumnsType<BonTravailOperation> = [
  { title: 'Code', dataIndex: 'code', key: 'code', width: 90 },
  { title: 'Désignation', dataIndex: 'designation', key: 'designation' },
  {
    title: 'Qté',
    dataIndex: 'quantite',
    key: 'quantite',
    width: 80,
    align: 'right',
    render: (v) => fmt(v),
  },
  {
    title: 'Prix unitaire',
    dataIndex: 'prix_unitaire',
    key: 'prix_unitaire',
    width: 120,
    align: 'right',
    render: (v) => (v == null ? '—' : fmtMoney(v as number)),
  },
]

const pieceExtColumns: ColumnsType<BonTravailPieceExterne> = [
  { title: 'Article', dataIndex: 'code', key: 'code', width: 130 },
  { title: 'Désignation', dataIndex: 'designation', key: 'designation', ellipsis: true },
  { title: 'Qté', dataIndex: 'quantite', key: 'quantite', width: 70, align: 'right', render: (v) => fmt(v) },
  {
    title: 'Prix unit.', dataIndex: 'prix_unitaire', key: 'prix_unitaire', width: 100, align: 'right',
    render: (v) => (v == null ? '—' : fmtMoney(v as number)),
  },
  {
    title: 'Montant TTC', dataIndex: 'montant_ttc', key: 'montant_ttc', width: 120, align: 'right',
    render: (v) => (v == null ? '—' : fmtMoney(v as number)),
  },
]

export default function BonTravailDetailDrawer({ reference, open, onClose }: Props) {
  const { data, isLoading, error } = useQuery<BonTravailDetail>({
    queryKey: ['bon-travail', reference],
    queryFn: () => fetchBonTravailDetail(reference as string),
    enabled: open && !!reference,
  })

  const v = data ?? ({} as BonTravailDetail)

  return (
    <Drawer
      title={
        <span>
          Bon de travail {fmt(v.reference)}{' '}
          {v.etat && (
            <Tag color={v.etat_code === 'ouverte' ? 'green' : 'default'}>{v.etat}</Tag>
          )}
        </span>
      }
      width={760}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : error ? (
        <Alert type="error" message="Impossible de charger le bon de travail." />
      ) : (
        <>
          <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Véhicule">{fmt(v.num_plaque)}</Descriptions.Item>
            <Descriptions.Item label="Marque / Type">
              {fmt(v.marque)}
              {v.type ? ` / ${v.type}` : ''}
            </Descriptions.Item>
            <Descriptions.Item label="Structure">{fmt(v.structure)}</Descriptions.Item>
            <Descriptions.Item label="Parc">{fmt(v.num_parc)}</Descriptions.Item>
            <Descriptions.Item label="Nature">{fmt(v.nature)}</Descriptions.Item>
            <Descriptions.Item label="Mode">{fmt(v.mode)}</Descriptions.Item>
            <Descriptions.Item label="Date d'entrée">{fmtDate(v.date_entree)}</Descriptions.Item>
            <Descriptions.Item label="Date sortie">{fmtDate(v.date_sortie)}</Descriptions.Item>
            <Descriptions.Item label="Index KM">{fmt(v.index_km)}</Descriptions.Item>
            <Descriptions.Item label="Coût total (TND)">
              <b>{fmtMoney(v.cout_total)}</b>
            </Descriptions.Item>
            <Descriptions.Item label="Observation" span={2}>
              {fmt(v.observation)}
            </Descriptions.Item>
          </Descriptions>

          <Tabs
            defaultActiveKey="operations"
            items={[
              {
                key: 'operations',
                label: `Opérations (${v.operations?.length ?? 0})`,
                children: (
                  <Table<BonTravailOperation>
                    rowKey={(r) => `${r.code}-${r.designation}`}
                    size="small"
                    columns={opColumns}
                    dataSource={v.operations ?? []}
                    pagination={false}
                    locale={{ emptyText: 'Aucune opération enregistrée' }}
                  />
                ),
              },
              {
                key: 'pieces_externes',
                label: `Pièces externes (${v.pieces_externes?.length ?? 0})`,
                children: (
                  <Table<BonTravailPieceExterne>
                    rowKey={(r, i) => `${r.code}-${i}`}
                    size="small"
                    columns={pieceExtColumns}
                    dataSource={v.pieces_externes ?? []}
                    pagination={false}
                    locale={{ emptyText: 'Aucune pièce externe' }}
                    scroll={{ x: 560 }}
                  />
                ),
              },
              {
                key: 'cout',
                label: 'Coût',
                children: (
                  <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label="Pièces">
                      {fmtMoney(v.montant_piece)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Main d'œuvre">
                      {fmtMoney(v.montant_main_oeuvre)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Réparation externe">
                      {fmtMoney(v.montant_rep_externe)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Coût total">
                      <b>{fmtMoney(v.cout_total)}</b>
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'facturation',
                label: 'Facturation',
                children: (
                  <Descriptions column={2} size="small" bordered>
                    <Descriptions.Item label="N° bon commande">{fmt(v.num_bc)}</Descriptions.Item>
                    <Descriptions.Item label="Date BC">{fmtDate(v.date_bc)}</Descriptions.Item>
                    <Descriptions.Item label="Fournisseur (n°)">{fmt(v.num_fourn)}</Descriptions.Item>
                    <Descriptions.Item label="Montant commande">{fmt(v.montant_commande)}</Descriptions.Item>
                    <Descriptions.Item label="N° facture">{fmt(v.num_facture)}</Descriptions.Item>
                    <Descriptions.Item label="Date facture">{fmtDate(v.date_facture)}</Descriptions.Item>
                    <Descriptions.Item label="N° règlement">{fmt(v.num_reglement)}</Descriptions.Item>
                    <Descriptions.Item label="Date règlement">{fmtDate(v.date_reglement)}</Descriptions.Item>
                    <Descriptions.Item label="Montant règlement" span={2}>
                      {fmt(v.montant_reglement)}
                    </Descriptions.Item>
                  </Descriptions>
                ),
              },
            ]}
          />
        </>
      )}
    </Drawer>
  )
}
