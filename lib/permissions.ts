import { UserRole } from '@prisma/client'

export type AuthUser = {
  id: string
  role: UserRole
}

export function canCreateSale(user: AuthUser) {
  return user.role === UserRole.manager || user.role === UserRole.promoter
}

export function canConfirmTicket(user: AuthUser) {
  return user.role === UserRole.partner || user.role === UserRole.partner_controller
}

export function canCancelTicket(user: AuthUser) {
  return user.role === UserRole.owner
}

