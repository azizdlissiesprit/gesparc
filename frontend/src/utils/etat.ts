// Vehicle status metadata (colors match the V_GESPARC_VEHICULE etat codes).
export const ETAT_META: Record<number, { label: string; color: string }> = {
  1: { label: 'en circulation', color: 'green' },
  2: { label: 'en réparation', color: 'orange' },
  3: { label: 'emprunté', color: 'purple' },
  4: { label: 'sinistré', color: 'red' },
  5: { label: 'réformé', color: 'default' },
  6: { label: 'vendu', color: 'blue' },
}

export function etatColor(code: number | null | undefined): string {
  if (code == null) return 'default'
  return ETAT_META[code]?.color ?? 'default'
}
