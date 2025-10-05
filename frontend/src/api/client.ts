import axios from 'axios'
import { useAuthStore } from '../store/auth'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true
})

api.interceptors.request.use(config => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshing: Promise<string | null> | null = null

api.interceptors.response.use(
  resp => resp,
  async error => {
    const { response, config } = error
    if (response?.status === 401 && !config.__isRetryRequest) {
      config.__isRetryRequest = true
      const store = useAuthStore.getState()
      if (!refreshing) {
        refreshing = store.refreshToken ? refreshAccessToken(store.refreshToken) : Promise.resolve(null)
      }
      const newToken = await refreshing
      refreshing = null
      if (newToken) {
        useAuthStore.getState().setAccessToken(newToken)
        config.headers = { ...(config.headers || {}), Authorization: `Bearer ${newToken}` }
        return api(config)
      }
    }
    return Promise.reject(error)
  }
)

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const r = await axios.post('/api/token/refresh/', { refresh: refreshToken })
    return r.data?.access ?? null
  } catch {
    return null
  }
}

