import { api } from './client'
import type {
  OrdreMission,
  OrdreMissionDetail,
  OrdreMissionQuery,
  OrdreMissionStats,
  Paginated,
} from '../types'

export async function fetchOrdresMission(
  q: OrdreMissionQuery,
): Promise<Paginated<OrdreMission>> {
  const { data } = await api.get<Paginated<OrdreMission>>('/ordres-mission/', {
    params: q,
  })
  return data
}

export async function fetchOrdreMissionStats(): Promise<OrdreMissionStats> {
  const { data } = await api.get<OrdreMissionStats>('/ordres-mission/stats/')
  return data
}

export async function fetchOrdreMissionDetail(
  numOm: number,
): Promise<OrdreMissionDetail> {
  const { data } = await api.get<OrdreMissionDetail>(`/ordres-mission/${numOm}/`)
  return data
}
