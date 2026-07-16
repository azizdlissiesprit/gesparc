import { api } from './client'
import type {
  Fournisseur,
  FournisseurDetail,
  FournisseurQuery,
  FournisseurStats,
  Paginated,
} from '../types'

export async function fetchFournisseurs(
  q: FournisseurQuery,
): Promise<Paginated<Fournisseur>> {
  const { data } = await api.get<Paginated<Fournisseur>>('/fournisseurs/', {
    params: q,
  })
  return data
}

export async function fetchFournisseurStats(): Promise<FournisseurStats> {
  const { data } = await api.get<FournisseurStats>('/fournisseurs/stats/')
  return data
}

export async function fetchFournisseurDetail(
  code: string,
): Promise<FournisseurDetail> {
  const { data } = await api.get<FournisseurDetail>(
    `/fournisseurs/${encodeURIComponent(code)}/`,
  )
  return data
}
