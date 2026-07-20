import { useSyncExternalStore, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Alert, Button } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { describeError } from '../utils/errors'

/** True while any query in the cache is in an error state. */
function useFirstQueryError(): unknown {
  const queryClient = useQueryClient()
  const cache = queryClient.getQueryCache()
  return useSyncExternalStore(
    (notify) => cache.subscribe(notify),
    () => cache.getAll().find((q) => q.state.status === 'error')?.state.error ?? null,
  )
}

/**
 * One app-level banner when the API is unreachable.
 *
 * Individual panels show their own error, but when the whole backend is down
 * that would mean a wall of identical messages — this states it once and
 * offers a single retry that refetches everything on screen.
 */
export default function ConnectionBanner() {
  const error = useFirstQueryError()
  const queryClient = useQueryClient()
  const [retrying, setRetrying] = useState(false)

  if (!error) return null
  const { title, description, retryable } = describeError(error)
  if (!retryable) return null

  const retryAll = async () => {
    setRetrying(true)
    try {
      await queryClient.refetchQueries({ type: 'active' })
    } finally {
      setRetrying(false)
    }
  }

  return (
    <Alert
      banner
      type="warning"
      showIcon
      message={title}
      description={description}
      action={
        <Button size="small" icon={<ReloadOutlined />} loading={retrying} onClick={retryAll}>
          Réessayer
        </Button>
      }
      style={{ marginBottom: 16 }}
    />
  )
}
