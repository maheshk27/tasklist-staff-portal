import axios, { type AxiosInstance, type AxiosResponse } from 'axios'
import { getServiceConfig, type ServiceName } from '../config/services'

/**
 * Create an axios instance for a specific service
 */
function createServiceClient(serviceName: ServiceName): AxiosInstance {
  const config = getServiceConfig(serviceName)

  const client = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout || 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Request interceptor to add auth token
  client.interceptors.request.use(
    (requestConfig) => {
      const token = localStorage.getItem('staff_access_token')
      if (token) {
        requestConfig.headers.Authorization = `Bearer ${token}`
      }
      return requestConfig
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // Response interceptor to handle token refresh
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      return response
    },
    async (error) => {
      const originalRequest = error.config

      // If token expired and we haven't already tried to refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true

        try {
          const refreshToken = localStorage.getItem('staff_refresh_token')
          if (refreshToken) {
            // Use onboarding service for refresh token endpoint
            const refreshConfig = getServiceConfig('onboarding')
            const refreshClient = axios.create({
              baseURL: refreshConfig.baseURL,
              timeout: refreshConfig.timeout || 10000,
            })

            const response = await refreshClient.post('/auth/refresh', {
              refreshToken,
            })

            if (response.data.success) {
              localStorage.setItem('staff_access_token', response.data.data.accessToken)
              localStorage.setItem('staff_refresh_token', response.data.data.refreshToken)

              // Retry the original request with new token
              originalRequest.headers.Authorization = `Bearer ${response.data.data.accessToken}`
              return client(originalRequest)
            } else {
              // Refresh failed, redirect to login
              localStorage.removeItem('staff_access_token')
              localStorage.removeItem('staff_refresh_token')
              window.location.href = '/login'
            }
          }
        } catch {
          // Refresh failed, redirect to login
          localStorage.removeItem('staff_access_token')
          localStorage.removeItem('staff_refresh_token')
          window.location.href = '/login'
        }
      }

      return Promise.reject(error)
    }
  )

  return client
}

// Create service-specific clients
export const onboardingApi = createServiceClient('onboarding')
export const taskApi = createServiceClient('task')
export const notificationApi = createServiceClient('notification')

// Default export for backward compatibility
const api = onboardingApi

export default api