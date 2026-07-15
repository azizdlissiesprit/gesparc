import { api } from './client'
import type { Demande, DemandeQuery, DemandeStats, Paginated } from '../types'

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
