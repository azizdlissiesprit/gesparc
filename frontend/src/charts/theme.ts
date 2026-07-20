// Chart design tokens — from the validated dataviz reference palette
// (light surface). Categorical sets were checked with the palette validator.

export const CHART = {
  surface: '#ffffff',
  ink: '#0b0b0b',
  inkSecondary: '#52514e',
  muted: '#898781', // axis / tick labels
  grid: '#e1e0d9', // hairline gridlines
  baseline: '#c3c2b7',
  // single-hue (magnitude) default
  blue: '#2a78d6',
  aqua: '#1baf7a',
  yellow: '#eda100',
} as const

// Vehicle status → categorical hue (validated set; slices carry direct labels
// + legend, satisfying the relief rule for the sub-3:1 / floor-band members).
export const ETAT_CHART_COLORS: Record<number, string> = {
  1: '#008300', // en circulation — green
  2: '#eb6834', // en réparation — orange
  3: '#4a3aa7', // emprunté — violet
  4: '#e34948', // sinistré — red
  5: '#eda100', // réformé — yellow
  6: '#2a78d6', // vendu — blue
}

// Work-order nature → categorical hue (blue / aqua / yellow — validated).
export const NATURE_CHART_COLORS: Record<string, string> = {
  '1': '#2a78d6', // Réparation
  '3': '#1baf7a', // Entretien
  '2': '#eda100', // Remorquage
}

// ---- number formatting -----------------------------------------------------
const nf = new Intl.NumberFormat('fr-FR')

/** Whole-number display (counts and rounded money) — never shows raw decimals. */
export const fmtInt = (n: number | null | undefined) =>
  nf.format(Math.round(Number(n ?? 0)))

/** Compact money in TND: 11.3 M, 942 k, 320. */
export function fmtMoneyShort(n: number | null | undefined): string {
  const v = Number(n ?? 0)
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M`
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)} k`
  return nf.format(Math.round(v))
}

export const cleanLabel = (s: string | null | undefined) => (s ? s.trim() : '—')
