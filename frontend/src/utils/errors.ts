import { AxiosError } from 'axios'

export interface ErrorInfo {
  title: string
  description: string
  /** False for client errors (4xx) — retrying the same request won't help. */
  retryable: boolean
}

/**
 * Turn any thrown value into something a user can act on.
 *
 * The common failure here is not a bug: the API is hosted on a free tier that
 * sleeps when idle, so the first request after a pause is slow or times out.
 * That case gets its own wording so it doesn't read as "the app is broken".
 */
export function describeError(error: unknown): ErrorInfo {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      title: 'Vous êtes hors ligne',
      description: 'Vérifiez votre connexion internet, puis réessayez.',
      retryable: true,
    }
  }

  const axiosError = error as AxiosError | undefined
  const status = axiosError?.response?.status
  const code = axiosError?.code

  // No response at all: network failure, CORS, or the server still waking up.
  if (axiosError?.isAxiosError && !axiosError.response) {
    const timedOut = code === 'ECONNABORTED' || code === 'ETIMEDOUT'
    return {
      title: timedOut ? 'Le serveur met du temps à répondre' : 'Serveur injoignable',
      description:
        "L'hébergement se met en veille après une période d'inactivité : le premier " +
        'chargement peut prendre jusqu’à une minute. Réessayez dans un instant.',
      retryable: true,
    }
  }

  if (status === 401 || status === 403) {
    return {
      title: 'Accès refusé',
      description: 'Vos identifiants sont invalides ou ont expiré. Rechargez la page pour vous reconnecter.',
      retryable: false,
    }
  }

  if (status === 404) {
    return {
      title: 'Donnée introuvable',
      description: "La ressource demandée n'existe pas ou a été supprimée.",
      retryable: false,
    }
  }

  if (status && status >= 500) {
    return {
      title: 'Erreur du serveur',
      description:
        'Le serveur a rencontré un problème en traitant la demande. Réessayez ; si le problème persiste, signalez-le.',
      retryable: true,
    }
  }

  if (status && status >= 400) {
    return {
      title: 'Requête invalide',
      description: 'La demande a été rejetée par le serveur. Ajustez vos filtres et réessayez.',
      retryable: false,
    }
  }

  return {
    title: 'Une erreur est survenue',
    description: 'Impossible de charger les données pour le moment. Réessayez.',
    retryable: true,
  }
}

/** react-query retry policy: back off on transient failures, give up on 4xx. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = (error as AxiosError | undefined)?.response?.status
  if (status && status >= 400 && status < 500) return false
  return failureCount < 3
}

/** Exponential backoff (1s, 2s, 4s…) capped so a cold start is covered. */
export const retryDelay = (attempt: number) => Math.min(1000 * 2 ** attempt, 15_000)
