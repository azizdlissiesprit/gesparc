import { Card, Col, Row, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { BreakdownRow } from '../types'

export interface BreakdownSpec {
  title: string
  header: string
  rows: BreakdownRow[]
}

const int = (n: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR').format(Number(n ?? 0))

const cols = (header: string, countLabel: string): ColumnsType<BreakdownRow> => [
  {
    title: header,
    dataIndex: 'label',
    key: 'label',
    ellipsis: true,
    render: (v) => <span dir="auto">{v ?? '—'}</span>,
  },
  {
    title: countLabel,
    dataIndex: 'nb',
    key: 'nb',
    width: 90,
    align: 'right',
    render: (v: number) => int(v),
  },
]

export default function BreakdownGrid({
  specs,
  countLabel = 'Nb',
  span = 6,
}: {
  specs: BreakdownSpec[]
  countLabel?: string
  span?: number
}) {
  return (
    <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
      {specs.map((s) => (
        <Col xs={24} sm={12} lg={span} key={s.title}>
          <Card title={s.title} size="small" styles={{ body: { padding: 0 } }}>
            <Table<BreakdownRow>
              rowKey={(r, i) => `${r.label}-${i}`}
              size="small"
              columns={cols(s.header, countLabel)}
              dataSource={s.rows}
              pagination={false}
              scroll={{ y: 240 }}
            />
          </Card>
        </Col>
      ))}
    </Row>
  )
}
