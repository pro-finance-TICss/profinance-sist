// ============================================================================
// ENUMERACIONES Y CONSTANTES (Capa de Dominio) - PRO-FINANCE
// ============================================================================
// Sincronizados con schema.prisma (donde son Strings por compatibilidad SQLite).
// Define los roles de usuario, estados de retiros y tickets del sistema.
// ============================================================================

/** Roles de usuario en el sistema, ordenados por nivel de privilegio */
export enum UserRole {
  /** Usuario estándar - acceso básico al dashboard y billetera */
  USER = "USER",
  /** Socio - acceso a rendimientos de socios, por encima de USER */
  SOCIO = "SOCIO",
  /** Administrador - gestión de usuarios y tickets */
  ADMIN = "ADMIN",
  /** Super Administrador - acceso total, incluye retiros y configuración global */
  SUPER_ADMIN = "SUPER_ADMIN",
}

/** Estados posibles de una solicitud de retiro */
export enum WithdrawalStatus {
  /** Pendiente de revisión */
  PENDING = "PENDING",
  /** Revisada por administración */
  REVIEWED = "REVIEWED",
  /** Aprobada, lista para pago */
  APPROVED = "APPROVED",
  /** Pagada al usuario (estado final) */
  PAID = "PAID",
  /** Rechazada (estado final, se reembolsa el balance) */
  REJECTED = "REJECTED",
}

/** Estados posibles de un ticket de soporte */
export enum TicketStatus {
  /** Abierto - esperando atención */
  OPEN = "OPEN",
  /** En progreso - siendo atendido */
  IN_PROGRESS = "IN_PROGRESS",
  /** Resuelto - pendiente de confirmación del usuario */
  RESOLVED = "RESOLVED",
  /** Cerrado (estado final) */
  CLOSED = "CLOSED",
}

/** Niveles de prioridad para tickets de soporte */
export enum TicketPriority {
  /** Baja - consultas generales */
  LOW = "LOW",
  /** Media - problemas menores */
  MEDIUM = "MEDIUM",
  /** Alta - problemas que afectan operaciones */
  HIGH = "HIGH",
  /** Urgente - problemas críticos de seguridad o financieros */
  URGENT = "URGENT",
}

/**
 * Transiciones válidas de estado para solicitudes de retiro.
 * Los estados solo pueden avanzar, nunca retroceder (máquina de estados unidireccional).
 */
export const VALID_WITHDRAWAL_TRANSITIONS: Record<
  WithdrawalStatus,
  WithdrawalStatus[]
> = {
  [WithdrawalStatus.PENDING]: [
    WithdrawalStatus.REVIEWED,
    WithdrawalStatus.APPROVED, // Permitir aprobación directa sin revisión previa
    WithdrawalStatus.REJECTED,
  ],
  [WithdrawalStatus.REVIEWED]: [
    WithdrawalStatus.APPROVED,
    WithdrawalStatus.REJECTED,
  ],
  [WithdrawalStatus.APPROVED]: [WithdrawalStatus.PAID], // Solo se puede pagar tras aprobar
  [WithdrawalStatus.PAID]: [], // Estado final - no se permiten más transiciones
  [WithdrawalStatus.REJECTED]: [], // Estado final - el balance ya fue reembolsado
};

/**
 * Transiciones válidas de estado para tickets de soporte.
 * Permite reabrir tickets resueltos si el usuario necesita más ayuda.
 */
export const VALID_TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS, TicketStatus.CLOSED],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.RESOLVED, TicketStatus.CLOSED],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.IN_PROGRESS], // Reapertura si el usuario responde
  [TicketStatus.CLOSED]: [], // Estado final - no se permiten más transiciones
};
