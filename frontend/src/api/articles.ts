import { api } from './client'
import type {
  Article,
  ArticleDetail,
  ArticleQuery,
  ArticleStats,
  Paginated,
} from '../types'

export async function fetchArticles(
  q: ArticleQuery,
): Promise<Paginated<Article>> {
  const { data } = await api.get<Paginated<Article>>('/articles/', { params: q })
  return data
}

export async function fetchArticleStats(): Promise<ArticleStats> {
  const { data } = await api.get<ArticleStats>('/articles/stats/')
  return data
}

export async function fetchArticleDetail(code: string): Promise<ArticleDetail> {
  const { data } = await api.get<ArticleDetail>(
    `/articles/${encodeURIComponent(code)}/`,
  )
  return data
}
