import type { User } from './auth'

export interface Store {
  storeId: number
  storeName: string
  storeCode: string
  storeImageUrl?: string
  addressLine1: string
  addressLine2?: string
  country: string
  state: string
  city: string
  pinCode: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface UserStoreMapping {
  userStoreId: number
  isActive: boolean
  assignedAt: string
  unAssignedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface StoreWithMapping {
  store: Store
  mapping: UserStoreMapping
}

export interface UserStoresResponseDto {
  user: User
  stores: StoreWithMapping[]
}