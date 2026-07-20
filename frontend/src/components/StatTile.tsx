import type { ReactNode } from 'react'
import { Card, Col, Row, Skeleton } from 'antd'
import { CHART } from '../charts/theme'

/**
 * Icon-chip accents. These are decorative (the label carries identity), but
 * status meaning stays consistent: good=green, warn=orange, bad=red.
 */
export const ACCENT = {
  neutral: '#2a78d6',
  info: '#096dd9',
  good: '#008300',
  warn: '#d46b08',
  bad: '#cf1322',
  alt: '#1baf7a',
  violet: '#4a3aa7',
} as const

export interface StatTileProps {
  /** Sentence case, no trailing colon. */
  label: string
  /** Pre-formatted value (auto-compact upstream: 1 284 / 12,9 k / 4,2 M). */
  value: string
  /** Optional context line under the value. */
  hint?: string
  icon?: ReactNode
  /** Accent hue for the icon chip. Identity lives in the label, not the color. */
  accent?: string
  loading?: boolean
}

/**
 * Stat tile — the form to use when the answer is a single number.
 * Value uses proportional figures (never tabular at display size).
 */
export function StatTile({
  label,
  value,
  hint,
  icon,
  accent = CHART.blue,
  loading,
}: StatTileProps) {
  return (
    <Card styles={{ body: { padding: 16 } }}>
      {loading ? (
        <Skeleton active paragraph={false} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {icon && (
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `${accent}1a`,
                color: accent,
                fontSize: 20,
              }}
            >
              {icon}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ color: CHART.muted, fontSize: 13, lineHeight: 1.3 }}>{label}</div>
            <div
              style={{
                fontSize: 23,
                fontWeight: 650,
                lineHeight: 1.25,
                color: CHART.ink,
                fontVariantNumeric: 'proportional-nums',
                whiteSpace: 'nowrap',
              }}
            >
              {value}
            </div>
            {hint && (
              <div style={{ color: CHART.inkSecondary, fontSize: 12, lineHeight: 1.3 }}>
                {hint}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}

/** Responsive row of stat tiles — one consistent rhythm across every module. */
export default function StatsRow({
  items,
  loading,
}: {
  items: StatTileProps[]
  loading?: boolean
}) {
  const span = items.length >= 6 ? 4 : items.length === 5 ? 5 : 6
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      {items.map((it) => (
        <Col xs={12} sm={12} md={8} lg={span} key={it.label} style={{ flex: 1 }}>
          <StatTile {...it} loading={loading} />
        </Col>
      ))}
    </Row>
  )
}
