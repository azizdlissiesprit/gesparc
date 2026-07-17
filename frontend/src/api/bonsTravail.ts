import { api } from './client'
import type {
  BonTravail,
  BonTravailDetail,
  BonTravailQuery,
  BonTravailStats,
  BtParAtelier,
  BtParMagasin,
  Paginated,
} from '../types'

export async function fetchBonsTravail(
  q: BonTravailQuery,
): Promise<Paginated<BonTravail>> {
  const { data } = await api.get<Paginated<BonTravail>>('/bons-travail/', {
    params: q,
  })
  return data
}

export async function fetchBonTravailStats(): Promise<BonTravailStats> {
  const { data } = await api.get<BonTravailStats>('/bons-travail/stats/')
  return data
}

export async function fetchBtParAtelier(): Promise<BtParAtelier[]> {
  const { data } = await api.get<BtParAtelier[]>('/bons-travail/par-atelier/')
  return data
}

export async function fetchBtParMagasin(): Promise<BtParMagasin[]> {
  const { data } = await api.get<BtParMagasin[]>('/bons-travail/par-magasin/')
  return data
}

export async function fetchBonTravailDetail(
  reference: string,
): Promise<BonTravailDetail> {
  const { data } = await api.get<BonTravailDetail>(
    `/bons-travail/${encodeURIComponent(reference)}/`,
  )
  return data
}
