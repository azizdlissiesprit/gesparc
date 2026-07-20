import { useCallback, useState } from 'react'
import type { ColumnsType } from 'antd/es/table'

export type SortOrder = 'asc' | 'desc'

/** The shape we actually read out of antd's sorter argument. */
type SorterLike = {
  columnKey?: string
  field?: string
  order?: 'ascend' | 'descend' | null
}

/**
 * Server-side table sorting.
 *
 * antd's built-in `sorter: (a, b) => …` only reorders the rows currently in the
 * DOM — on a paginated list that silently sorts one page of 20 and presents it
 * as the whole result. So columns are marked `sorter: true` (sort handled
 * upstream) and the key/direction are sent to the API instead.
 */
export function useTableSort(onChanged?: () => void) {
  const [sort, setSort] = useState<string | undefined>()
  const [order, setOrder] = useState<SortOrder | undefined>()

  // Params are `unknown` so this stays assignable to Table<T>['onChange'] for
  // any row type; the sorter is narrowed to the little we read from it.
  const onTableChange = useCallback(
    (_pagination: unknown, _filters: unknown, sorter: unknown) => {
      const s = (Array.isArray(sorter) ? sorter[0] : sorter) as SorterLike | undefined
      const key = s?.columnKey ?? s?.field
      if (!s?.order || !key) {
        setSort(undefined)
        setOrder(undefined)
      } else {
        setSort(key)
        setOrder(s.order === 'ascend' ? 'asc' : 'desc')
      }
      onChanged?.()
    },
    [onChanged],
  )

  const reset = useCallback(() => {
    setSort(undefined)
    setOrder(undefined)
  }, [])

  /**
   * Mark the given column keys sortable and reflect the active sort, so the
   * header arrow always matches what the server actually ordered by.
   */
  const sortable = useCallback(
    <T,>(columns: ColumnsType<T>, keys: string[]): ColumnsType<T> =>
      columns.map((col) => {
        const key = (col as { key?: string }).key
        if (!key || !keys.includes(key)) return col
        return {
          ...col,
          sorter: true,
          sortOrder: sort === key ? (order === 'asc' ? 'ascend' : 'descend') : null,
        }
      }),
    [sort, order],
  )

  return { sort, order, onTableChange, sortable, reset }
}
