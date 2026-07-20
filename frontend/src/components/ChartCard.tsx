import { useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { Card, Empty, Skeleton, Table, Tooltip as AntTooltip, Button } from 'antd'
import { AreaChartOutlined, TableOutlined } from '@ant-design/icons'
import { ResponsiveContainer } from 'recharts'
import { CHART } from '../charts/theme'

export interface TableView {
  /** Column header for the category/dimension column. */
  dimension: string
  /** Column header for the measure column. */
  measure: string
  rows: { key: string; label: string; value: string }[]
}

/**
 * Chart card with a table-view twin.
 *
 * Every chart ships an accessible table equivalent: it carries the values for
 * readers who can't separate hues (and is the required relief for palette
 * entries that sit under 3:1 against the surface).
 */
export default function ChartCard({
  title,
  subtitle,
  loading,
  empty,
  height = 300,
  table,
  children,
}: {
  title: string
  subtitle?: string
  loading: boolean
  empty?: boolean
  height?: number
  table?: TableView
  children: ReactNode
}) {
  const [asTable, setAsTable] = useState(false)
  const showTable = asTable && !!table

  return (
    <Card
      title={
        <div style={{ lineHeight: 1.3, padding: '4px 0' }}>
          <div style={{ fontWeight: 600 }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: 12, fontWeight: 400, color: CHART.muted }}>{subtitle}</div>
          )}
        </div>
      }
      extra={
        table ? (
          <AntTooltip title={showTable ? 'Afficher le graphique' : 'Afficher les données'}>
            <Button
              type="text"
              size="small"
              aria-label={showTable ? 'Afficher le graphique' : 'Afficher les données'}
              icon={showTable ? <AreaChartOutlined /> : <TableOutlined />}
              onClick={() => setAsTable((v) => !v)}
            />
          </AntTooltip>
        ) : undefined
      }
      styles={{ body: { padding: showTable ? 0 : 16, height, overflow: 'auto' } }}
    >
      {loading ? (
        <div style={{ padding: showTable ? 16 : 0 }}>
          <Skeleton active />
        </div>
      ) : empty ? (
        <Empty />
      ) : showTable ? (
        <Table
          size="small"
          rowKey="key"
          pagination={false}
          columns={[
            { title: table!.dimension, dataIndex: 'label', key: 'label', ellipsis: true },
            {
              title: table!.measure,
              dataIndex: 'value',
              key: 'value',
              width: 130,
              align: 'right',
              render: (v: string) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{v}</span>,
            },
          ]}
          dataSource={table!.rows}
        />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          {children as ReactElement}
        </ResponsiveContainer>
      )}
    </Card>
  )
}
