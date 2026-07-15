import { api } from './client'
import type {
  Paginated,
  ReformeLigne,
  ReformeQuery,
  ReformeStats,
} from '../types'

export async function fetchReformes(
  q: ReformeQuery,
): Promise<Paginated<ReformeLigne>> {
  const { data } = await api.get<Paginated<ReformeLigne>>('/reformes/', {
    params: q,
  })
  return data
}

export async function fetchReformeStats(): Promise<ReformeStats> {
  const { data } = await api.get<ReformeStats>('/reformes/stats/')
  return data
}
