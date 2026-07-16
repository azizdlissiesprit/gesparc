import { api } from './client'
import type {
  Paginated,
  Sinistre,
  SinistreDetail,
  SinistreQuery,
  SinistreStats,
} from '../types'

export async function fetchSinistres(
  q: SinistreQuery,
): Promise<Paginated<Sinistre>> {
  const { data } = await api.get<Paginated<Sinistre>>('/sinistres/', { params: q })
  return data
}

export async function fetchSinistreStats(): Promise<SinistreStats> {
  const { data } = await api.get<SinistreStats>('/sinistres/stats/')
  return data
}

export async function fetchSinistreDetail(
  numSin: string,
): Promise<SinistreDetail> {
  const { data } = await api.get<SinistreDetail>(
    `/sinistres/${encodeURIComponent(numSin)}/`,
  )
  return data
}
