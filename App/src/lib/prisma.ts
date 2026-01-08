// ============================================================================
// PRISMA CLIENT SINGLETON
// ============================================================================
// Evita crear múltiples instancias del cliente Prisma en desarrollo.
// En producción, cada request debería tener su propia conexión manejada.
// ============================================================================

import { PrismaClient } from "@prisma/client";

/**
 * Declaración global para mantener la instancia de Prisma en desarrollo.
 * Esto evita el error "Too many Prisma Clients" durante hot reloading.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Cliente Prisma singleton.
 * Reutiliza la instancia existente en desarrollo o crea una nueva en producción.
 */
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// En desarrollo, almacenamos la instancia en el objeto global
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
