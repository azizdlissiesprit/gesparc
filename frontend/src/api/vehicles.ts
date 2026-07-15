import { api } from './client'
import type {
  LookupItem,
  Paginated,
  VehicleDetail,
  VehicleListItem,
  VehicleQuery,
  VehicleStats,
} from '../types'

export async function fetchVehicles(
  q: VehicleQuery,
): Promise<Paginated<VehicleListItem>> {
  const { data } = await api.get<Paginated<VehicleListItem>>('/vehicles/', {
    params: q,
  })
  return data
}

export async function fetchVehicle(numVeh: string): Promise<VehicleDetail> {
  const { data } = await api.get<VehicleDetail>(
    `/vehicles/${encodeURIComponent(numVeh)}/`,
  )
  return data
}

export async function fetchVehicleStats(): Promise<VehicleStats> {
  const { data } = await api.get<VehicleStats>('/vehicles/stats/')
  return data
}

export async function fetchLookup(
  name: string,
  params?: Record<string, string | number>,
): Promise<LookupItem[]> {
  const { data } = await api.get<LookupItem[]>(`/lookups/${name}/`, { params })
  return data
}
