import { api } from './client'
import type {
  AchatCarburant,
  AchatCarburantDetail,
  AchatCarburantQuery,
  AchatCarburantStats,
  Paginated,
} from '../types'

export async function fetchAchatsCarburant(
  q: AchatCarburantQuery,
): Promise<Paginated<AchatCarburant>> {
  const { data } = await api.get<Paginated<AchatCarburant>>('/achats-carburant/', { params: q })
  return data
}
export async function fetchAchatCarburantStats(): Promise<AchatCarburantStats> {
  const { data } = await api.get<AchatCarburantStats>('/achats-carburant/stats/')
  return data
}
export async function fetchAchatCarburantDetail(reference: string): Promise<AchatCarburantDetail> {
  const { data } = await api.get<AchatCarburantDetail>(
    `/achats-carburant/${encodeURIComponent(reference)}/`,
  )
  return data
}
