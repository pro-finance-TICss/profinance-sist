// ============================================================================
// ENUMS & CONSTANTS (Domain Layer)
// ============================================================================
// Sincronizados con schema.prisma (donde son Strings por compatibilidad SQLite)

export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN",
  SUPER_ADMIN = "SUPER_ADMIN",
}

export enum WithdrawalStatus {
  PENDING = "PENDING",
  REVIEWED = "REVIEWED",
  APPROVED = "APPROVED",
  PAID = "PAID",
  REJECTED = "REJECTED",
}

export enum TicketStatus {
  OPEN = "OPEN",
  IN_PROGRESS = "IN_PROGRESS",
  RESOLVED = "RESOLVED",
  CLOSED = "CLOSED",
}

export enum TicketPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export const VALID_WITHDRAWAL_TRANSITIONS: Record<
  WithdrawalStatus,
  WithdrawalStatus[]
> = {
  [WithdrawalStatus.PENDING]: [
    WithdrawalStatus.REVIEWED,
    WithdrawalStatus.REJECTED,
  ],
  [WithdrawalStatus.REVIEWED]: [
    WithdrawalStatus.APPROVED,
    WithdrawalStatus.REJECTED,
  ],
  [WithdrawalStatus.APPROVED]: [WithdrawalStatus.PAID], // Solo se puede pagar tras aprobar
  [WithdrawalStatus.PAID]: [], // Estado final
  [WithdrawalStatus.REJECTED]: [WithdrawalStatus.PENDING], // Permite re-intentar? No, final. Pero a veces se reabre.
  // Según requisitos: "Los estados SOLO pueden avanzar, nunca retroceder".
  // REJECTED es final.
};

export const VALID_TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS, TicketStatus.CLOSED],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.RESOLVED, TicketStatus.CLOSED],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.IN_PROGRESS], // Reopen?
  [TicketStatus.CLOSED]: [], // Final
};
