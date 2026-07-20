/** Mirrors export.MAX_ROWS on the backend — surfaced so the cap is never a surprise. */
export const EXPORT_MAX_ROWS = 20000

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

/**
 * Build the CSV export URL for a resource, carrying the current filters.
 * Empty / undefined filters are omitted so the backend sees the same state
 * the list endpoint saw.
 */
export function buildExportUrl(
  resource: string,
  params: Record<string, string | number | undefined | null>,
): string {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    qs.append(key, String(value))
  }
  const query = qs.toString()
  return `${API_BASE}/export/${resource}/${query ? `?${query}` : ''}`
}
