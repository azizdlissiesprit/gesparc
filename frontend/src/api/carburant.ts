import { api } from './client'
import type {
  CarburantQuery,
  CarburantStats,
  LigneCarburant,
  Paginated,
} from '../types'

export async function fetchCarburant(
  q: CarburantQuery,
): Promise<Paginated<LigneCarburant>> {
  const { data } = await api.get<Paginated<LigneCarburant>>('/carburant/', {
    params: q,
  })
  return data
}

export async function fetchCarburantStats(): Promise<CarburantStats> {
  const { data } = await api.get<CarburantStats>('/carburant/stats/')
  return data
}
