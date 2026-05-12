/**
 * Service configuration for micro-service architecture
 */

export interface ServiceConfig {
  baseURL: string
  timeout?: number
  retries?: number
}

export const services = {
  onboarding: {
    baseURL: import.meta.env.VITE_ONBOARDING_API_BASE_URL || '',
    timeout: 10000,
  },
  task: {
    baseURL: import.meta.env.VITE_TASK_API_BASE_URL || '',
    timeout: 10000,
  },
  notification: {
    baseURL: import.meta.env.VITE_NOTIFICATION_API_BASE_URL || '',
    timeout: 10000,
  },
} as const

export type ServiceName = keyof typeof services

/**
 * Get service configuration by name
 */
export function getServiceConfig(serviceName: ServiceName): ServiceConfig {
  const service = services[serviceName]
  if (!service.baseURL) {
    throw new Error(`Service ${serviceName} baseURL is not configured`)
  }
  return service
}

/**
 * Check if all required services are configured
 */
export function validateServiceConfiguration(): void {
  const requiredServices = ['onboarding'] // At minimum, onboarding service is required
  const missingServices: string[] = []

  for (const serviceName of requiredServices) {
    if (!services[serviceName as ServiceName].baseURL) {
      missingServices.push(serviceName)
    }
  }

  if (missingServices.length > 0) {
    console.warn(`Missing service configurations: ${missingServices.join(', ')}`)
  }
}

// Validate configuration on import
validateServiceConfiguration()