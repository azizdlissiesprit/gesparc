import { Button, Result, Space, Typography } from 'antd'
import { ReloadOutlined, WarningOutlined } from '@ant-design/icons'
import { describeError } from '../utils/errors'
import { CHART } from '../charts/theme'

const { Text } = Typography

/**
 * Inline error surface for a failed data panel.
 *
 * `compact` fits inside a card body (stat row, chart card); the full variant is
 * for a whole page region. Retry is only offered when retrying can actually
 * help — a 4xx gets an explanation instead of a button that will fail again.
 */
export default function ErrorState({
  error,
  onRetry,
  compact = false,
}: {
  error: unknown
  onRetry?: () => void
  compact?: boolean
}) {
  const { title, description, retryable } = describeError(error)

  if (compact) {
    return (
      <div
        role="alert"
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: 16,
          textAlign: 'center',
        }}
      >
        <WarningOutlined style={{ fontSize: 22, color: CHART.yellow }} />
        <Text strong>{title}</Text>
        <Text type="secondary" style={{ fontSize: 12, maxWidth: 340 }}>
          {description}
        </Text>
        {retryable && onRetry && (
          <Button size="small" icon={<ReloadOutlined />} onClick={onRetry}>
            Réessayer
          </Button>
        )}
      </div>
    )
  }

  return (
    <div role="alert">
      <Result
        status="warning"
        title={title}
        subTitle={description}
        extra={
          <Space>
            {retryable && onRetry && (
              <Button type="primary" icon={<ReloadOutlined />} onClick={onRetry}>
                Réessayer
              </Button>
            )}
            <Button onClick={() => window.location.reload()}>Recharger la page</Button>
          </Space>
        }
      />
    </div>
  )
}
