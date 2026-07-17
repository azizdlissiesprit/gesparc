import { api } from './client'
import type {
  Paginated,
  Reception,
  ReceptionBreakdown,
  ReceptionQuery,
  ReceptionStats,
} from '../types'

export async function fetchReceptions(
  q: ReceptionQuery,
): Promise<Paginated<Reception>> {
  const { data } = await api.get<Paginated<Reception>>('/receptions/', {
    params: q,
  })
  return data
}

export async function fetchReceptionStats(): Promise<ReceptionStats> {
  const { data } = await api.get<ReceptionStats>('/receptions/stats/')
  return data
}

export async function fetchReceptionBreakdown(): Promise<ReceptionBreakdown> {
  const { data } = await api.get<ReceptionBreakdown>('/receptions/breakdown/')
  return data
}
