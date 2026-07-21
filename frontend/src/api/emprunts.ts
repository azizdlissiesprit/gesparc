import { api } from './client'
import type { Emprunt, EmpruntQuery, EmpruntStats, Paginated } from '../types'

export async function fetchEmprunts(q: EmpruntQuery): Promise<Paginated<Emprunt>> {
  const { data } = await api.get<Paginated<Emprunt>>('/emprunts/', { params: q })
  return data
}
export async function fetchEmpruntStats(): Promise<EmpruntStats> {
  const { data } = await api.get<EmpruntStats>('/emprunts/stats/')
  return data
}
