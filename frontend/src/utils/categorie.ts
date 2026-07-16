// Distinguishes real road vehicles from stationary groupes électrogènes
// (generators, marque "GE") that share the fleet/fuel tables.
export const CATEGORIE_META: Record<string, { label: string; color: string }> = {
  vehicule: { label: 'Véhicule', color: 'blue' },
  groupe_electrogene: { label: 'Groupe électrogène', color: 'gold' },
}

export const CATEGORIE_OPTIONS = [
  { value: 'vehicule', label: 'Véhicule' },
  { value: 'groupe_electrogene', label: 'Groupe électrogène' },
]

export function categorieTag(cat: string | null | undefined) {
  return CATEGORIE_META[cat ?? ''] ?? { label: cat ?? '—', color: 'default' }
}
