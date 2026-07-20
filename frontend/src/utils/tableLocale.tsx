import ErrorState from '../components/ErrorState'

/**
 * antd Table `locale` that turns the empty slot into an error + retry.
 *
 * Without this a failed list is indistinguishable from "no results" — the user
 * is told there is no data when in fact we never got any.
 * Returns undefined when there is no error so the default empty state stands.
 */
export function tableErrorLocale(error: unknown, onRetry?: () => void) {
  if (!error) return undefined
  return { emptyText: <ErrorState error={error} onRetry={onRetry} compact /> }
}
