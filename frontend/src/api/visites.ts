import { api } from './client'
import type {
  Paginated,
  VisiteQuery,
  VisiteStats,
  VisiteTechnique,
} from '../types'

export async function fetchVisites(
  q: VisiteQuery,
): Promise<Paginated<VisiteTechnique>> {
  const { data } = await api.get<Paginated<VisiteTechnique>>(
    '/visites-techniques/',
    { params: q },
  )
  return data
}

export async function fetchVisiteStats(): Promise<VisiteStats> {
  const { data } = await api.get<VisiteStats>('/visites-techniques/stats/')
  return data
}
