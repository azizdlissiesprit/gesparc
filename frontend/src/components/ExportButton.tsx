import { useState } from 'react'
import { App, Button, Tooltip } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { EXPORT_MAX_ROWS } from '../utils/exportUrl'
import { buildExportUrl } from '../utils/exportUrl'

/**
 * Downloads the current list as a filtered CSV.
 *
 * Navigates to the export URL rather than fetching into a blob: the browser
 * streams the file straight to disk (no buffering in the tab) and carries the
 * session's credentials, which a background fetch would have to re-negotiate.
 */
export default function ExportButton({
  resource,
  params,
  disabled,
}: {
  /** Export resource key — must match the backend EXPORTS registry. */
  resource: string
  /** Current filter state; empty values are dropped. */
  params: Record<string, string | number | undefined | null>
  disabled?: boolean
}) {
  const { message } = App.useApp()
  const [busy, setBusy] = useState(false)

  const onClick = () => {
    setBusy(true)
    message.open({ type: 'loading', content: 'Préparation de l’export…', duration: 1.5 })
    // Let the browser own the download; a hidden anchor keeps the SPA mounted.
    const a = document.createElement('a')
    a.href = buildExportUrl(resource, params)
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => setBusy(false), 1500)
  }

  return (
    <Tooltip
      title={`Exporte la liste filtrée au format CSV (Excel) — jusqu’à ${EXPORT_MAX_ROWS.toLocaleString('fr-FR')} lignes`}
    >
      <Button icon={<DownloadOutlined />} onClick={onClick} loading={busy} disabled={disabled}>
        Exporter
      </Button>
    </Tooltip>
  )
}
