import { api } from './client'
import type { Vehicle360 } from '../types'

export async function fetchVehicle360(numVeh: string): Promise<Vehicle360> {
  const { data } = await api.get<Vehicle360>(
    `/vehicles/${encodeURIComponent(numVeh)}/360/`,
  )
  return data
}
