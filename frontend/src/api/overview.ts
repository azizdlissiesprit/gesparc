import { api } from './client'
import type { OverviewData } from '../types'

export async function fetchOverview(): Promise<OverviewData> {
  const { data } = await api.get<OverviewData>('/overview/')
  return data
}
