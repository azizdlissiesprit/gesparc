import axios from 'axios'

// In dev, Vite proxies /api -> Django (see vite.config.ts).
// In prod, set VITE_API_BASE_URL to the backend origin.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
  // The API sleeps on the free tier; a cold start needs room to answer, but a
  // request must still fail eventually instead of hanging the UI forever.
  timeout: 30_000,
})
