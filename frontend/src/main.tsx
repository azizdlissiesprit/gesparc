import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, App as AntApp } from 'antd'
import frFR from 'antd/locale/fr_FR'
import 'antd/dist/reset.css'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, staleTime: 30_000 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={frFR}
        theme={{
          token: {
            colorPrimary: '#1677ff',
            borderRadius: 8,
            fontFamily:
              "'Segoe UI', system-ui, -apple-system, Roboto, Arial, sans-serif",
          },
        }}
      >
        <AntApp>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  </StrictMode>,
)
