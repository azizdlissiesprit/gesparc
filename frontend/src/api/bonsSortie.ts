import { api } from './client'
import type {
  BonSortie,
  BonSortieBreakdown,
  BonSortieQuery,
  BonSortieStats,
  Paginated,
} from '../types'

export async function fetchBonsSortie(
  q: BonSortieQuery,
): Promise<Paginated<BonSortie>> {
  const { data } = await api.get<Paginated<BonSortie>>('/bons-sortie/', {
    params: q,
  })
  return data
}

export async function fetchBonSortieStats(): Promise<BonSortieStats> {
  const { data } = await api.get<BonSortieStats>('/bons-sortie/stats/')
  return data
}

export async function fetchBonSortieBreakdown(): Promise<BonSortieBreakdown> {
  const { data } = await api.get<BonSortieBreakdown>('/bons-sortie/breakdown/')
  return data
}
