import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App as AntApp } from 'antd'
import frFR from 'antd/locale/fr_FR'
import 'antd/dist/reset.css'
import './index.css'
import App from './App.tsx'
import AppErrorBoundary from './components/AppErrorBoundary'
import { retryDelay, shouldRetry } from './utils/errors'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      // Ride out a cold start / transient blip, but never retry a 4xx.
      retry: shouldRetry,
      retryDelay,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={frFR}
        theme={{
          token: {
            // One blue for UI and charts, so the whole app reads as one system.
            colorPrimary: '#2a78d6',
            colorInfo: '#2a78d6',
            colorTextBase: '#0b0b0b',
            colorBgLayout: '#f5f6f8',
            borderRadius: 10,
            fontSize: 14,
            controlHeight: 36,
            fontFamily:
              "'Segoe UI', system-ui, -apple-system, Roboto, Arial, sans-serif",
          },
          components: {
            Layout: { bodyBg: '#f5f6f8', siderBg: '#ffffff', headerBg: '#ffffff' },
            Card: { headerFontSize: 15, headerBg: 'transparent' },
            // Calmer table chrome: the data is the only thing allowed to be loud.
            Table: {
              headerBg: '#fafafa',
              headerColor: '#52514e',
              headerSplitColor: 'transparent',
              rowHoverBg: '#f2f7fd',
              borderColor: '#f0f0ef',
              cellPaddingBlock: 12,
            },
            Menu: { itemBorderRadius: 8, itemMarginInline: 8, itemHeight: 38 },
            Statistic: { contentFontSize: 23 },
          },
        }}
      >
        <AntApp>
          <AppErrorBoundary>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </AppErrorBoundary>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  </StrictMode>,
)
