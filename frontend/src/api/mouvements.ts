import { api } from './client'
import type { MouvementStock, MvtQuery, MvtStats, Paginated } from '../types'

export async function fetchMouvements(
  q: MvtQuery,
): Promise<Paginated<MouvementStock>> {
  const { data } = await api.get<Paginated<MouvementStock>>(
    '/mouvements-stock/',
    { params: q },
  )
  return data
}

export async function fetchMouvementStats(): Promise<MvtStats> {
  const { data } = await api.get<MvtStats>('/mouvements-stock/stats/')
  return data
}
