import { useQuery } from '@tanstack/react-query'
import { Card, Col, Row, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  fetchBonTravailStats,
  fetchBtParAtelier,
  fetchBtParMagasin,
} from '../api/bonsTravail'

interface Row {
  key: string
  label: string
  nb: number
}

const int = (n: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR').format(Number(n ?? 0))

const cols = (header: string): ColumnsType<Row> => [
  { title: header, dataIndex: 'label', key: 'label', ellipsis: true },
  {
    title: 'Nb BT',
    dataIndex: 'nb',
    key: 'nb',
    width: 110,
    align: 'right',
    render: (v: number) => int(v),
  },
]

function BreakdownCard({ title, header, rows }: { title: string; header: string; rows: Row[] }) {
  return (
    <Card title={title} size="small" styles={{ body: { padding: 0 } }}>
      <Table<Row>
        rowKey="key"
        size="small"
        columns={cols(header)}
        dataSource={rows}
        pagination={false}
        scroll={{ y: 240 }}
      />
    </Card>
  )
}

export default function BtBreakdown() {
  const { data: stats } = useQuery({
    queryKey: ['bt-stats'],
    queryFn: fetchBonTravailStats,
  })
  const { data: parAtelier } = useQuery({
    queryKey: ['bt-par-atelier'],
    queryFn: fetchBtParAtelier,
    staleTime: 60_000,
  })
  const { data: parMagasin } = useQuery({
    queryKey: ['bt-par-magasin'],
    queryFn: fetchBtParMagasin,
    staleTime: 60_000,
  })

  const modeRows: Row[] = [
    { key: 'interne', label: 'Interne', nb: stats?.internes ?? 0 },
    { key: 'externe', label: 'Externe', nb: stats?.externes ?? 0 },
  ]
  const natureRows: Row[] = (stats?.by_nature ?? []).map((r) => ({
    key: String(r.nature_code),
    label: r.nature,
    nb: r.n,
  }))
  const atelierRows: Row[] = (parAtelier ?? []).map((r, i) => ({
    key: r.num_atelier ?? String(i),
    label: (r.atelier ?? '—').trim(),
    nb: r.nb_bt,
  }))
  const magasinRows: Row[] = (parMagasin ?? []).map((r, i) => ({
    key: r.num_mag ?? String(i),
    label: (r.magasin ?? '—').trim(),
    nb: r.nb_bt,
  }))

  return (
    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
      <Col xs={24} sm={12} lg={6}>
        <BreakdownCard title="Par mode" header="Mode" rows={modeRows} />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <BreakdownCard title="Par nature" header="Nature" rows={natureRows} />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <BreakdownCard title="Par atelier" header="Atelier" rows={atelierRows} />
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <BreakdownCard title="Par magasin" header="Magasin" rows={magasinRows} />
      </Col>
    </Row>
  )
}
