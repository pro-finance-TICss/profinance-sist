// ============================================================================
// UTILIDADES DE CONTROL DE ACCESO BASADO EN ROLES (RBAC) - PRO-FINANCE
// ============================================================================
// Funciones para verificar permisos, validar transiciones de estado
// y registrar auditoría de acciones en el sistema.
// ============================================================================

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  UserRole,
  WithdrawalStatus,
  TicketStatus,
  VALID_WITHDRAWAL_TRANSITIONS,
  VALID_TICKET_TRANSITIONS,
} from "./enums";

// ============================================================================
// UTILIDADES RBAC (Control de Acceso Basado en Roles)
// ============================================================================

/**
 * Obtiene el rol del usuario actual. Retorna null si no hay sesión.
 */
export async function getCurrentRole(): Promise<UserRole | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  // Buscar en DB para asegurar rol actualizado (no confiar solo en cookie)
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  return (user?.role as UserRole) || null;
}

/**
 * Verifica si el usuario tiene el rol requerido o superior.
 * Jerarquía: SUPER_ADMIN > ADMIN > SOCIO > USER
 */
export async function hasPermission(requiredRole: UserRole): Promise<boolean> {
  const currentRole = await getCurrentRole();
  if (!currentRole) return false;

  // SUPER_ADMIN tiene acceso a todo
  if (currentRole === UserRole.SUPER_ADMIN) return true;
  
  // ADMIN tiene acceso a todo excepto SUPER_ADMIN
  if (currentRole === UserRole.ADMIN && requiredRole !== UserRole.SUPER_ADMIN)
    return true;
  
  // SOCIO tiene acceso a SOCIO y USER
  if (currentRole === UserRole.SOCIO && (requiredRole === UserRole.SOCIO || requiredRole === UserRole.USER))
    return true;
  
  // USER solo tiene acceso a USER
  if (currentRole === UserRole.USER && requiredRole === UserRole.USER)
    return true;

  return false;
}

/**
 * Lanza error si no tiene permisos. Útil para Server Actions.
 */
export async function requireRole(requiredRole: UserRole) {
  const allowed = await hasPermission(requiredRole);
  if (!allowed) {
    throw new Error("Acceso Denegado: Permisos insuficientes.");
  }
}

// ============================================================================
// LÓGICA DE MÁQUINA DE ESTADOS
// ============================================================================

/**
 * Valida si una transición de estado es válida según reglas estrictas.
 */
export function validateWithdrawalTransition(
  current: WithdrawalStatus,
  next: WithdrawalStatus
): boolean {
  const allowed = VALID_WITHDRAWAL_TRANSITIONS[current];
  return allowed?.includes(next) || false;
}

export function validateTicketTransition(
  current: TicketStatus,
  next: TicketStatus
): boolean {
  const allowed = VALID_TICKET_TRANSITIONS[current];
  return allowed?.includes(next) || false;
}

// ============================================================================
// REGISTRO DE AUDITORÍA
// ============================================================================

export async function logAudit(
  action: string,
  entityType: string,
  entityId: string,
  details?: object
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    console.warn("⚠️ Intento de registro de auditoría sin ID de usuario");
    return;
  }

  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        details: details ? JSON.stringify(details) : null,
        // ipAddress: headers().get("x-forwarded-for") // Opcional si estamos en server component
      },
    });
  } catch (error) {
    console.error("❌ Error al escribir registro de auditoría:", error);
    // No fallar la transacción principal si el log falla, pero reportar el error
  }
}
