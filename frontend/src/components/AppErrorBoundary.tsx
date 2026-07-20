import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Button, Result, Typography } from 'antd'

const { Paragraph, Text } = Typography

/**
 * Last line of defence: a render-time crash would otherwise blank the whole
 * page. Data-fetch failures are handled per panel — this catches the bugs.
 */
export default class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the detail in the console for diagnosis; the UI stays calm.
    console.error('Erreur non gérée dans l’interface :', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <Result
        status="error"
        title="L'affichage a rencontré un problème"
        subTitle="Une erreur inattendue s'est produite. Vous pouvez recharger la page pour continuer."
        extra={[
          <Button type="primary" key="reload" onClick={() => window.location.reload()}>
            Recharger la page
          </Button>,
          <Button key="back" onClick={() => this.setState({ error: null })}>
            Réessayer
          </Button>,
        ]}
      >
        <Paragraph>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {error.message}
          </Text>
        </Paragraph>
      </Result>
    )
  }
}
