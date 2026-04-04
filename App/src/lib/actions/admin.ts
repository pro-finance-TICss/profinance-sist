"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  UserRole,
  WithdrawalStatus,
  TicketStatus,
  VALID_WITHDRAWAL_TRANSITIONS,
  VALID_TICKET_TRANSITIONS,
} from "@/lib/enums";
import {
  requireRole,
  logAudit,
  validateWithdrawalTransition,
  validateTicketTransition,
} from "@/lib/security";
import { createNotification } from "@/lib/actions/notifications";
import { decimalToNumber } from "@/lib/utils/currency";

// ============================================================================
// GESTIÓN DE USUARIOS (ADMIN)
// ============================================================================

/**
 * Obtiene la lista de todos los usuarios registrados.
 * Requiere rol de ADMIN o superior.
 */
export async function getUsers() {
  await requireRole(UserRole.ADMIN);
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        paternalSurname: true,
        email: true,
        role: true,
        createdAt: true,
        totpEnabled: true,
        baseCurrency: true,
        accounts: {
          select: {
            id: true,
            name: true,
            role: true,
            investedCapital: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // Serializar Decimals a números para evitar error de Next.js
    const serializedUsers = users.map((user) => ({
      ...user,
      accounts: user.accounts.map((acc) => ({
        ...acc,
        investedCapital: decimalToNumber(acc.investedCapital),
      })),
    }));

    return { success: true, users: serializedUsers };
  } catch (error) {
    logger.error("❌ Error al obtener usuarios:", error);
    return { success: false, message: "Error al obtener usuarios" };
  }
}

/**
 * Actualiza el rol de un usuario.
 * Solo SUPER_ADMIN puede promover roles críticos.
 */
export async function updateUserRole(userId: string, newRole: string) {
  // Solo SuperAdmin debería poder promover roles críticos
  await requireRole(UserRole.SUPER_ADMIN);

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    await logAudit("USER_ROLE_UPDATED", "User", userId, { newRole });
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    logger.error("❌ Error al actualizar rol:", error);
    return { success: false, message: "Error al actualizar rol" };
  }
}

/**
 * Alterna el rol de un usuario entre USER y SOCIO (solo SUPERADMIN).
 * No permite alterar roles de ADMIN o SUPER_ADMIN.
 */
export async function toggleUserSocioRole(userId: string) {
  await requireRole(UserRole.SUPER_ADMIN);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, email: true },
    });

    if (!user) {
      return { success: false, message: "Usuario no encontrado" };
    }

    // Solo permitir alternar entre USER y SOCIO
    if (user.role !== "USER" && user.role !== "SOCIO") {
      return {
        success: false,
        message: "Solo se puede alternar entre roles USER y SOCIO",
      };
    }

    const newRole = user.role === "USER" ? "SOCIO" : "USER";

    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    await logAudit("USER_ROLE_TOGGLED", "User", userId, {
      oldRole: user.role,
      newRole,
    });
    
    // Revalidar rutas relevantes
    revalidatePath("/admin/users");
    revalidatePath("/superadmin");
    revalidatePath("/dashboard");
    
    return { 
      success: true, 
      newRole,
      message: `Rol actualizado. El usuario (${user.email}) debe cerrar sesión y volver a iniciar para ver los cambios.`
    };
  } catch (error) {
    logger.error("❌ Error al alternar rol:", error);
    return { success: false, message: "Error al alternar rol" };
  }
}

/**
 * Alterna el rol de una CUENTA (cajita) específica entre USER y SOCIO.
 * Solo SUPER_ADMIN puede ejecutar esta acción.
 */
export async function toggleAccountRole(accountId: string) {
  await requireRole(UserRole.SUPER_ADMIN);

  try {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, name: true, role: true, userId: true, user: { select: { email: true } } },
    });

    if (!account) {
      return { success: false, message: "Cuenta no encontrada" };
    }

    const newRole = account.role === "USER" ? "SOCIO" : "USER";

    await prisma.account.update({
      where: { id: accountId },
      data: { role: newRole },
    });

    await logAudit("ACCOUNT_ROLE_TOGGLED", "Account", accountId, {
      accountName: account.name,
      oldRole: account.role,
      newRole,
      userId: account.userId,
    });

    revalidatePath("/superadmin/users");
    revalidatePath("/superadmin");
    revalidatePath("/dashboard");

    return {
      success: true,
      newRole,
      message: `Cajita "${account.name}" actualizada a ${newRole}. El usuario (${account.user.email}) verá los cambios al recargar.`,
    };
  } catch (error) {
    logger.error("❌ Error al alternar rol de cuenta:", error);
    return { success: false, message: "Error al alternar rol de la cuenta" };
  }
}

/**
 * Agrega saldo manualmente a una cuenta ("cajita").
 * Solo SUPER_ADMIN puede ejecutar esta acción.
 */
export async function addCapitalToAccount(accountId: string, amount: number) {
  try {
    await requireRole(UserRole.SUPER_ADMIN);

    if (amount <= 0) {
      return { success: false, message: "El monto debe ser mayor a 0" };
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { user: { select: { email: true } } },
    });

    if (!account) {
      return { success: false, message: "Cuenta no encontrada" };
    }

    // Usar transacción de Prisma para asegurar consistencia
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar balance de la cuenta
      await tx.account.update({
        where: { id: accountId },
        data: { investedCapital: { increment: amount } },
      });

      // 2. Crear registro de transacción
      await tx.transaction.create({
        data: {
          userId: account.userId,
          accountId: accountId,
          type: "DEPOSIT", // Usamos DEPOSIT para que aparezca en el historial estándar
          amount: amount,
          status: "COMPLETED",
          paymentId: `ADMIN-ADD-${Date.now()}-${Math.random().toString(36).substring(7)}`, // ID único para rastreo
        },
      });

      // 3. Log de auditoría
      await logAudit("ADMIN_ADDED_FUNDS", "Account", accountId, {
        amount,
        accountName: account.name,
        userId: account.userId,
      });
    }, {
      maxWait: 5000, // default: 2000
      timeout: 20000, // default: 5000
    });

    revalidatePath("/superadmin/users");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Se agregaron $${amount} a la cajita "${account.name}".`,
    };
  } catch (error) {
    logger.error("❌ Error al agregar saldo:", error);
    return { success: false, message: "Error al agregar saldo: " + (error instanceof Error ? error.message : "Desconocido") };
  }
}


// ============================================================================
// GESTIÓN DE TICKETS (ADMIN)
// ============================================================================

/**
 * Obtiene todos los tickets de soporte del sistema.
 * Requiere rol de ADMIN o superior.
 */
export async function getAllTickets() {
  await requireRole(UserRole.ADMIN);
  try {
    const tickets = await prisma.ticket.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, firstName: true } },
        _count: { select: { messages: true } },
      },
    });
    return { success: true, tickets };
  } catch (error) {
    return { success: false, message: "Error al obtener tickets" };
  }
}

/**
 * Obtiene un ticket específico con sus mensajes para panel de administración.
 */
export async function getAdminTicket(ticketId: string) {
  await requireRole(UserRole.ADMIN);
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: { email: true, firstName: true, paternalSurname: true },
        },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    return { success: true, ticket };
  } catch (error) {
    return { success: false, message: "Error al obtener ticket" };
  }
}

export async function updateTicketStatus(
  ticketId: string,
  newStatus: TicketStatus
) {
  await requireRole(UserRole.ADMIN);

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { success: false, message: "Ticket no encontrado" };

  // Validar Transición de Estado
  if (!validateTicketTransition(ticket.status as TicketStatus, newStatus)) {
    return {
      success: false,
      message: `Transición de estado no válida: ${ticket.status} → ${newStatus}`,
    };
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: newStatus },
  });

  await logAudit("TICKET_STATUS_UPDATED", "Ticket", ticketId, {
    old: ticket.status,
    new: newStatus,
  });
  revalidatePath("/admin/tickets");
  return { success: true };
}

export async function replyTicket(ticketId: string, message: string) {
  await requireRole(UserRole.ADMIN);
  const session = await auth();

  if (!session?.user?.id) return { success: false, message: "No autorizado" };

  try {
    // Crear mensaje
    await prisma.ticketMessage.create({
      data: {
        ticketId,
        userId: session.user.id,
        message,
        isAdmin: true,
      },
    });

    // Actualizar estado si es necesario (OPEN -> IN_PROGRESS)
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (ticket && ticket.status === TicketStatus.OPEN) {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.IN_PROGRESS },
      });
    }

    revalidatePath("/admin/tickets");
    return { success: true };
  } catch (error) {
    logger.error("Error replying to ticket:", error);
    return { success: false, message: "Error al responder" };
  }
}

// ============================================================================
// GESTIÓN DE RETIROS (SOLO SUPER_ADMIN)
// ============================================================================

import { decryptAccountNumber } from "@/lib/utils/encryption";
import { getSystemSettingBoolean, setSystemSetting } from "@/lib/config";
import { WITHDRAWAL_GLOBAL_SETTING_KEY } from "@/lib/logic/withdrawal-window";
import { logger } from "@/lib/logger";

export async function getWithdrawals() {
  await requireRole(UserRole.SUPER_ADMIN);
  try {
    const withdrawalsRaw = await prisma.withdrawalRequest.findMany({
      orderBy: { requestedAt: "desc" },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            paternalSurname: true,
            maternalSurname: true,
          },
        },
        account: {
          select: {
            investedCapital: true,
          },
        },
        bankAccount: {
          select: {
            id: true,
            holderName: true,
            documentType: true,
            documentNumber: true,
            bankName: true,
            accountNumberLast4: true,
            accountNumberEncrypted: true,
            accountType: true,
            country: true,
          },
        },
      },
    });

    const withdrawals = withdrawalsRaw.map((w) => ({
      id: w.id,
      amount: w.amount.toString(),
      status: w.status,
      requestedAt: w.requestedAt.toISOString(),
      user: {
        email: w.user.email,
        investedCapital: w.account?.investedCapital?.toString() || "0",
        firstName: w.user.firstName,
        paternalSurname: w.user.paternalSurname,
        maternalSurname: w.user.maternalSurname,
      },
      bankAccount: w.bankAccount
        ? {
            id: w.bankAccount.id,
            holderName: w.bankAccount.holderName,
            documentType: w.bankAccount.documentType,
            documentNumber: w.bankAccount.documentNumber,
            bankName: w.bankAccount.bankName,
            accountNumberLast4: w.bankAccount.accountNumberLast4,
            fullAccountNumber: decryptAccountNumber(
              w.bankAccount.accountNumberEncrypted
            ),
            accountType: w.bankAccount.accountType,
            country: w.bankAccount.country,
          }
        : null,
    }));

    return { success: true, withdrawals };
  } catch (error) {
    logger.error("❌ Error al obtener retiros:", error);
    return { success: false, message: "Error al obtener solicitudes de retiro" };
  }
}

export async function getGlobalWithdrawalSettings() {
  await requireRole(UserRole.SUPER_ADMIN);
  const isEnabled = await getSystemSettingBoolean(
    WITHDRAWAL_GLOBAL_SETTING_KEY,
    true
  );
  return { success: true, isEnabled };
}

export async function updateGlobalWithdrawalSettings(isEnabled: boolean) {
  await requireRole(UserRole.SUPER_ADMIN);
  try {
    await setSystemSetting(
      WITHDRAWAL_GLOBAL_SETTING_KEY,
      isEnabled.toString(),
      "Global withdrawal toggle controlled by Super Admin"
    );
    await logAudit(
      "SYSTEM_SETTING_UPDATED",
      "SystemSetting",
      WITHDRAWAL_GLOBAL_SETTING_KEY,
      { isEnabled }
    );

    // Rehabilitar rutas relevantes
    revalidatePath("/dashboard/wallet");
    revalidatePath("/superadmin/withdrawals");

    return { success: true };
  } catch (error) {
    logger.error("Error updating settings:", error);
    return { success: false, message: "Error al actualizar configuración" };
  }
}

export async function processWithdrawal(
  id: string,
  newStatus: WithdrawalStatus,
  notes?: string
) {
  await requireRole(UserRole.SUPER_ADMIN);
  const session = await auth();

  const withdrawal = await prisma.withdrawalRequest.findUnique({
    where: { id },
  });
  if (!withdrawal) return { success: false, message: "Solicitud no encontrada" };

  // 1. Validar transición de estado
  if (
    !validateWithdrawalTransition(
      withdrawal.status as WithdrawalStatus,
      newStatus
    )
  ) {
    return {
      success: false,
      message: `Transición no válida: ${withdrawal.status} → ${newStatus}`,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Actualizar solicitud
      await tx.withdrawalRequest.update({
        where: { id },
        data: {
          status: newStatus,
          processedAt: new Date(),
          processedBy: session?.user?.id,
          notes,
        },
      });

      // Lógica de reembolso si la solicitud es rechazada
      if (
        newStatus === WithdrawalStatus.REJECTED &&
        withdrawal.status !== WithdrawalStatus.REJECTED
      ) {
        // Devolver balance a la cuenta si hay accountId
        if (withdrawal.accountId) {
          await tx.account.update({
            where: { id: withdrawal.accountId },
            data: { investedCapital: { increment: withdrawal.amount } },
          });
        }
        await tx.transaction.create({
          data: {
            userId: withdrawal.userId,
            accountId: withdrawal.accountId,
            type: "REFUND",
            amount: withdrawal.amount,
            status: "COMPLETED",
            paymentId: `REFUND-${id}`,
          },
        });
      }
    });

    // Notificar al usuario
    await createNotification(
      withdrawal.userId,
      `Retiro ${
        newStatus === WithdrawalStatus.APPROVED ? "Aprobado" : "Rechazado"
      }`,
      `Su solicitud de retiro ha sido ${
        newStatus === WithdrawalStatus.APPROVED ? "aprobada" : "rechazada"
      }.${notes ? ` Nota: ${notes}` : ""}`,
      newStatus === WithdrawalStatus.APPROVED ? "SUCCESS" : "ERROR"
    );

    await logAudit("WITHDRAWAL_PROCESSED", "Withdrawal", id, { newStatus });
    revalidatePath("/superadmin/withdrawals");
    return { success: true };
  } catch (error) {
    logger.error(error);
    return { success: false, message: "Error al procesar la transacción" };
  }
}

// ============================================================================
// GESTIÓN CRUD DE USUARIOS (SOLO SUPER_ADMIN)
// ============================================================================

/**
 * Devuelve un resumen de los datos que se eliminarán antes de borrar un usuario.
 * Útil para mostrar una confirmación informada al administrador.
 */
export async function getUserDeletePreview(userId: string) {
  await requireRole(UserRole.SUPER_ADMIN);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        paternalSurname: true,
        email: true,
        role: true,
        accounts: {
          select: {
            id: true,
            name: true,
            role: true,
            investedCapital: true,
          },
        },
        _count: {
          select: {
            transactions: true,
            withdrawalRequests: true,
            tickets: true,
            sessions: true,
          },
        },
      },
    });

    if (!user) {
      return { success: false, message: "Usuario no encontrado" };
    }

    if (user.role === "SUPER_ADMIN") {
      return {
        success: false,
        message: "No se puede eliminar a otro Super Admin.",
      };
    }

    return {
      success: true,
      preview: {
        id: user.id,
        name: `${user.firstName} ${user.paternalSurname}`,
        email: user.email,
        role: user.role,
        accounts: user.accounts.map((acc) => ({
          ...acc,
          investedCapital: decimalToNumber(acc.investedCapital),
        })),
        counts: user._count,
      },
    };
  } catch (error) {
    logger.error("❌ Error al obtener preview de eliminación:", error);
    return { success: false, message: "Error al obtener datos del usuario" };
  }
}

/**
 * Crea un nuevo usuario con rol USER, SOCIO o ADMIN.
 * - Todos los usuarios se crean con mustChangePassword = true y totpEnabled = false
 * - Se crea una cajita inicial automáticamente
 * - No se puede crear usuarios SUPER_ADMIN desde este endpoint
 */
export async function createUser(data: {
  firstName: string;
  paternalSurname: string;
  maternalSurname: string;
  email: string;
  password: string;
  /** Rol global: USER o ADMIN. No se crea SOCIO a nivel de usuario desde el panel. */
  role: "USER" | "ADMIN";
  /** Tipo de cajita inicial que se creará automáticamente. */
  accountRole: "USER" | "SOCIO";
  country: string;
  baseCurrency: string;
}) {
  await requireRole(UserRole.SUPER_ADMIN);

  // Bloquear creación de SUPER_ADMIN
  if (data.role === ("SUPER_ADMIN" as string)) {
    return { success: false, message: "No se puede crear usuarios SUPER_ADMIN desde el panel." };
  }

  // Validaciones básicas
  if (!data.firstName || !data.paternalSurname || !data.email || !data.password) {
    return { success: false, message: "Faltan campos obligatorios." };
  }
  if (!data.email.includes("@")) {
    return { success: false, message: "El formato del email no es válido." };
  }
  if (data.password.length < 8) {
    return { success: false, message: "La contraseña debe tener al menos 8 caracteres." };
  }

  try {
    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash(data.password, 12);

    const accountName =
      data.accountRole === "SOCIO" ? "Mi Cuenta Socio" : "Mi Cuenta";

    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        paternalSurname: data.paternalSurname,
        maternalSurname: data.maternalSurname || "",
        email: data.email.toLowerCase().trim(),
        password: hashedPassword,
        role: data.role,
        country: data.country ? data.country.toUpperCase() : null,
        baseCurrency: data.baseCurrency.toUpperCase(),
        totpEnabled: false,
        mustChangePassword: true,
        accounts: {
          create: {
            name: accountName,
            role: data.accountRole,
            investedCapital: 0,
          },
        },
      },
    });

    await logAudit("USER_CREATED_BY_ADMIN", "User", user.id, {
      role: data.role,
      email: user.email,
    });

    revalidatePath("/superadmin/users");
    return {
      success: true,
      message: `Usuario ${user.email} creado exitosamente con rol ${data.role}.`,
    };
  } catch (error: any) {
    if (error?.code === "P2002") {
      return { success: false, message: "El correo electrónico ya está registrado." };
    }
    logger.error("❌ Error al crear usuario:", error);
    return { success: false, message: "Error al crear el usuario." };
  }
}

/**
 * Edita los datos de un usuario existente.
 * El rol solo puede modificarse entre USER, SOCIO y ADMIN (no SUPER_ADMIN).
 * No permite editar a otro SUPER_ADMIN.
 */
export async function updateUser(
  userId: string,
  data: {
    firstName: string;
    paternalSurname: string;
    maternalSurname: string;
    email: string;
    country: string;
    baseCurrency: string;
    role: "USER" | "SOCIO" | "ADMIN";
  }
) {
  await requireRole(UserRole.SUPER_ADMIN);

  try {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, email: true },
    });

    if (!existing) {
      return { success: false, message: "Usuario no encontrado." };
    }
    if (existing.role === "SUPER_ADMIN") {
      return { success: false, message: "No se puede editar a otro Super Admin." };
    }
    if (data.role === ("SUPER_ADMIN" as string)) {
      return { success: false, message: "No se puede asignar el rol SUPER_ADMIN desde el panel." };
    }
    if (!data.email.includes("@")) {
      return { success: false, message: "El formato del email no es válido." };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        paternalSurname: data.paternalSurname,
        maternalSurname: data.maternalSurname || "",
        email: data.email.toLowerCase().trim(),
        country: data.country ? data.country.toUpperCase() : null,
        baseCurrency: data.baseCurrency.toUpperCase(),
        role: data.role,
      },
    });

    await logAudit("USER_UPDATED_BY_ADMIN", "User", userId, {
      newData: { ...data, email: data.email.toLowerCase().trim() },
      oldEmail: existing.email,
    });

    revalidatePath("/superadmin/users");
    return { success: true, message: "Usuario actualizado correctamente." };
  } catch (error: any) {
    if (error?.code === "P2002") {
      return { success: false, message: "El correo electrónico ya está en uso por otro usuario." };
    }
    logger.error("❌ Error al actualizar usuario:", error);
    return { success: false, message: "Error al actualizar el usuario." };
  }
}

/**
 * Elimina un usuario y todos sus datos asociados en cascada.
 * No se puede eliminar a un SUPER_ADMIN.
 */
export async function deleteUser(userId: string) {
  await requireRole(UserRole.SUPER_ADMIN);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, email: true, firstName: true, paternalSurname: true },
    });

    if (!user) {
      return { success: false, message: "Usuario no encontrado." };
    }
    if (user.role === "SUPER_ADMIN") {
      return { success: false, message: "No se puede eliminar a otro Super Admin." };
    }

    // Guardar info para el audit log antes de eliminar
    const userInfo = { email: user.email, role: user.role };

    await prisma.user.delete({ where: { id: userId } });

    await logAudit("USER_DELETED_BY_ADMIN", "User", userId, userInfo);
    revalidatePath("/superadmin/users");

    return {
      success: true,
      message: `Usuario ${user.email} eliminado exitosamente.`,
    };
  } catch (error) {
    logger.error("❌ Error al eliminar usuario:", error);
    return { success: false, message: "Error al eliminar el usuario." };
  }
}
