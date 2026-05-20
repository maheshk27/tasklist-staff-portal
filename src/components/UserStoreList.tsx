import React, { useEffect, useState } from 'react'
import { onboardingService } from '../services/apiManager'
import type { StoreWithMapping } from '../types/user-store'
import { formatDateTime } from '../utils/date'

interface UserStoreListProps {
  userId: number
}

const UserStoreList: React.FC<UserStoreListProps> = ({ userId }) => {
  const [stores, setStores] = useState<StoreWithMapping[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchUserStores = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await onboardingService.getUserStores(userId)
        if (!cancelled) {
          setStores(response.stores)
        }
      } catch (err) {
        if (!cancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load store mappings'
          setError(errorMessage)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchUserStores()

    return () => {
      cancelled = true
    }
  }, [userId])

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Assigned Stores</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Assigned Stores</h2>
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (stores.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Assigned Stores</h2>
        <p className="text-muted-foreground text-sm">No stores assigned</p>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
      <h2 className="text-xl font-semibold mb-4">
        Assigned Stores
        <span className="ml-2 text-sm font-normal text-muted-foreground">({stores.length})</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stores.map(({ store, mapping }) => (
          <div
            key={store.storeId}
            className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow bg-background"
          >
            {/* Store Name & Badge */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <h3 className="font-semibold text-foreground">{store.storeName}</h3>
              <span
                className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${mapping.isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
                  }`}
              >
                {mapping.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* Store Code */}
            <p className="text-xs text-muted-foreground mb-2">Code: {store.storeCode}</p>

            {/* Address */}
            <div className="text-sm text-muted-foreground space-y-0.5 mb-2">
              <p>{store.addressLine1}</p>
              {store.addressLine2 && <p>{store.addressLine2}</p>}
              <p>
                {store.city}, {store.state} {store.pinCode}
              </p>
            </div>

            {mapping.isActive ? (
              <p className="text-sm text-muted-foreground mb-2">
                Assigned On:{' '}
                {mapping?.assignedAt
                  ? formatDateTime(mapping.assignedAt)
                  : '-'}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mb-2">
                Unassigned On:{' '}
                {mapping?.unAssignedAt
                  ? formatDateTime(mapping.unAssignedAt)
                  : '-'}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default UserStoreList