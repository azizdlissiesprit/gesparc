import { api } from './client'
import type { Paginated, TaxeCirculation, TaxeQuery, TaxeStats } from '../types'

export async function fetchTaxes(
  q: TaxeQuery,
): Promise<Paginated<TaxeCirculation>> {
  const { data } = await api.get<Paginated<TaxeCirculation>>(
    '/taxes-circulation/',
    { params: q },
  )
  return data
}

export async function fetchTaxeStats(): Promise<TaxeStats> {
  const { data } = await api.get<TaxeStats>('/taxes-circulation/stats/')
  return data
}
