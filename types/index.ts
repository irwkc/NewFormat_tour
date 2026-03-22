import { UserRole, TicketStatus, PaymentMethod, PaymentStatus, ModerationStatus, CommissionType, BalanceType, TransactionType } from '@prisma/client'

export type { UserRole, TicketStatus, PaymentMethod, PaymentStatus, ModerationStatus, CommissionType, BalanceType, TransactionType }

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
