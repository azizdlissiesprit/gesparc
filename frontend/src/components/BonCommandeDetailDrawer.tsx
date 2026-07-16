import { useQuery } from '@tanstack/react-query'
import { Alert, Descriptions, Drawer, Spin, Table, Tabs, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { fetchBonCommandeDetail } from '../api/bonsCommande'
import type { BonCommandeDetail, BonCommandeLigne } from '../types'

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

const ligneColumns: ColumnsType<BonCommandeLigne> = [
  { title: 'Code article', dataIndex: 'code', key: 'code', width: 130 },
  { title: 'Désignation', dataIndex: 'designation', key: 'designation', render: fmt },
  { title: 'Qté', dataIndex: 'quantite', key: 'quantite', width: 70, align: 'right', render: (v) => fmt(v) },
  {
    title: 'Prix unitaire',
    dataIndex: 'prix_unitaire',
    key: 'prix_unitaire',
    width: 110,
    align: 'right',
    render: (v) => fmtMoney(v as number),
  },
  {
    title: 'Total TTC',
    dataIndex: 'montant_ttc',
    key: 'montant_ttc',
    width: 120,
    align: 'right',
    render: (v) => fmtMoney(v as number),
  },
]

export default function BonCommandeDetailDrawer({ reference, open, onClose }: Props) {
  const { data, isLoading, error } = useQuery<BonCommandeDetail>({
    queryKey: ['bon-commande', reference],
    queryFn: () => fetchBonCommandeDetail(reference as string),
    enabled: open && !!reference,
  })

  const v = data ?? ({} as BonCommandeDetail)
  const totalTTC = (v.lignes ?? []).reduce((s, l) => s + Number(l.montant_ttc ?? 0), 0)

  return (
    <Drawer
      title={
        <span>
          Bon de commande {fmt(v.reference)}{' '}
          {v.statut && (
            <Tag color={v.statut_code === 'receptionne' ? 'green' : 'orange'}>
              {v.statut}
            </Tag>
          )}
        </span>
      }
      width={800}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : error ? (
        <Alert type="error" message="Impossible de charger le bon de commande." />
      ) : (
        <Tabs
          defaultActiveKey="entete"
          items={[
            {
              key: 'entete',
              label: 'Bon de commande',
              children: (
                <Descriptions column={2} size="small" bordered>
                  <Descriptions.Item label="Référence">{fmt(v.reference)}</Descriptions.Item>
                  <Descriptions.Item label="Date création">{fmtDate(v.date_creation)}</Descriptions.Item>
                  <Descriptions.Item label="Fournisseur">{fmt(v.fournisseur)}</Descriptions.Item>
                  <Descriptions.Item label="Code fournisseur">{fmt(v.num_fourn)}</Descriptions.Item>
                  <Descriptions.Item label="Parc">{fmt(v.parc)}</Descriptions.Item>
                  <Descriptions.Item label="N° marché">{fmt(v.num_marche)}</Descriptions.Item>
                  <Descriptions.Item label="Montant commande">{fmtMoney(v.montant)}</Descriptions.Item>
                  <Descriptions.Item label="Montant livré">{fmtMoney(v.montant_livre)}</Descriptions.Item>
                  <Descriptions.Item label="Date livraison">{fmtDate(v.date_livraison)}</Descriptions.Item>
                  <Descriptions.Item label="Montant facturé">{fmtMoney(v.montant_facture)}</Descriptions.Item>
                  <Descriptions.Item label="Date facture">{fmtDate(v.date_facture)}</Descriptions.Item>
                  <Descriptions.Item label="Montant règlement">{fmtMoney(v.montant_reglement)}</Descriptions.Item>
                  <Descriptions.Item label="Date règlement" span={2}>{fmtDate(v.date_reglement)}</Descriptions.Item>
                </Descriptions>
              ),
            },
            {
              key: 'articles',
              label: `Articles (${v.lignes?.length ?? 0})`,
              children: (
                <Table<BonCommandeLigne>
                  rowKey={(r) => `${r.code}-${r.designation}`}
                  size="small"
                  columns={ligneColumns}
                  dataSource={v.lignes ?? []}
                  pagination={false}
                  scroll={{ x: 640 }}
                  locale={{ emptyText: 'Aucun article' }}
                  summary={() => (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={4} align="right">
                        <b>Total TTC</b>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4} align="right">
                        <b>{fmtMoney(totalTTC)}</b>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
              ),
            },
          ]}
        />
      )}
    </Drawer>
  )
}
