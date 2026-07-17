import { api } from './client'
import type {
  Demande,
  DemandeParUgp,
  DemandeQuery,
  DemandeStats,
  Paginated,
} from '../types'

export async function fetchDemandes(
  q: DemandeQuery,
): Promise<Paginated<Demande>> {
  const { data } = await api.get<Paginated<Demande>>('/demandes/', { params: q })
  return data
}

export async function fetchDemandeStats(): Promise<DemandeStats> {
  const { data } = await api.get<DemandeStats>('/demandes/stats/')
  return data
}

export async function fetchDemandesParUgp(): Promise<DemandeParUgp[]> {
  const { data } = await api.get<DemandeParUgp[]>('/demandes/par-ugp/')
  return data
}
