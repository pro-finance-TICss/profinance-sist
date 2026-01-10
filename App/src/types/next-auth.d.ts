// ============================================================================
// TIPOS EXTENDIDOS DE NEXTAUTH - PRO-FINANCE
// ============================================================================
// Extiende los tipos de NextAuth para incluir campos personalizados en la
// sesión y el token JWT (id, role, tokenVersion, lastLogin).
// ============================================================================

import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  /**
   * Interfaz extendida del usuario en la sesión.
   * Incluye campos de seguridad y control de acceso.
   */
  interface User {
    /** ID único del usuario en la base de datos */
    id: string;
    /** Rol del usuario (USER, ADMIN, etc.) */
    role: string;
    /** Versión del token para validación de single-session */
    tokenVersion: number;
    /** Fecha del último inicio de sesión */
    lastLogin?: Date | string | null;
  }

  /**
   * Sesión extendida con datos de seguridad.
   */
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      lastLogin?: string | null;
    } & import("next-auth").DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  /**
   * Token JWT extendido con datos de seguridad.
   */
  interface JWT {
    /** ID único del usuario */
    id: string;
    /** Email del usuario */
    email: string;
    /** Nombre del usuario */
    name: string;
    /** Rol del usuario */
    role: string;
    /** Versión del token para validación */
    tokenVersion: number;
    /** Timestamp del último login */
    lastLogin?: string | null;
  }
}
