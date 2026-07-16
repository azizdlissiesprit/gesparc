import { api } from './client'
import type {
  BonCommande,
  BonCommandeDetail,
  BonCommandeQuery,
  BonCommandeStats,
  Paginated,
} from '../types'

export async function fetchBonsCommande(
  q: BonCommandeQuery,
): Promise<Paginated<BonCommande>> {
  const { data } = await api.get<Paginated<BonCommande>>('/bons-commande/', {
    params: q,
  })
  return data
}

export async function fetchBonCommandeStats(): Promise<BonCommandeStats> {
  const { data } = await api.get<BonCommandeStats>('/bons-commande/stats/')
  return data
}

export async function fetchBonCommandeDetail(
  reference: string,
): Promise<BonCommandeDetail> {
  const { data } = await api.get<BonCommandeDetail>(
    `/bons-commande/${encodeURIComponent(reference)}/`,
  )
  return data
}
