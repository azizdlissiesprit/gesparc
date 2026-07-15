import type { ValidityStatut } from '../types'

// Validity-status metadata for frais / visites (label + Ant Design tag color).
export const STATUT_META: Record<
  ValidityStatut,
  { label: string; color: string }
> = {
  valide: { label: 'Valide', color: 'green' },
  bientot: { label: 'Expire bientôt', color: 'orange' },
  expiree: { label: 'Expirée', color: 'red' },
  inconnu: { label: 'Inconnu', color: 'default' },
}

export const STATUT_OPTIONS = (Object.keys(STATUT_META) as ValidityStatut[]).map(
  (k) => ({ value: k, label: STATUT_META[k].label }),
)
