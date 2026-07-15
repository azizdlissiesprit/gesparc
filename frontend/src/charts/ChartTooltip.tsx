import type { ReactNode } from 'react'
import { CHART } from './theme'

interface TooltipEntry {
  name?: ReactNode
  value?: number | string
  color?: string
  payload?: { fill?: string }
}

interface Props {
  active?: boolean
  payload?: TooltipEntry[]
  label?: ReactNode
  valueFmt?: (v: number) => string
}

// Consistent tooltip: white surface, hairline ring, ink-token text, a small
// swatch in the mark's own color (identity is never text-only).
export default function ChartTooltip({ active, payload, label, valueFmt }: Props) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: CHART.surface,
        border: '1px solid rgba(11,11,11,0.10)',
        borderRadius: 8,
        padding: '8px 12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.10)',
        fontSize: 13,
      }}
    >
      {label != null && label !== '' && (
        <div style={{ color: CHART.inkSecondary, fontSize: 12, marginBottom: 4 }}>
          {label}
        </div>
      )}
      {payload.map((p, i) => (
        <div
          key={i}
          style={{ display: 'flex', alignItems: 'center', gap: 8, color: CHART.ink }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: p.color ?? p.payload?.fill ?? CHART.blue,
              flex: 'none',
            }}
          />
          <span>
            {p.name}:{' '}
            <b style={{ fontVariantNumeric: 'tabular-nums' }}>
              {typeof p.value === 'number' && valueFmt ? valueFmt(p.value) : p.value}
            </b>
          </span>
        </div>
      ))}
    </div>
  )
}
