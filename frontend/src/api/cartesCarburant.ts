import { api } from './client'
import type { CarteCarburant, CarteCarburantQuery, CarteCarburantStats, Paginated } from '../types'

export async function fetchCartesCarburant(
  q: CarteCarburantQuery,
): Promise<Paginated<CarteCarburant>> {
  const { data } = await api.get<Paginated<CarteCarburant>>('/cartes-carburant/', { params: q })
  return data
}
export async function fetchCarteCarburantStats(): Promise<CarteCarburantStats> {
  const { data } = await api.get<CarteCarburantStats>('/cartes-carburant/stats/')
  return data
}
