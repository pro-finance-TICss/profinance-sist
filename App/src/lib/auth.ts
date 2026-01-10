// ============================================================================
// CONFIGURACIÓN DE NEXTAUTH v5 - PRO-FINANCE (SEGURIDAD BANCARIA)
// ============================================================================
// Configuración central de autenticación con:
// - Cookies seguras (HttpOnly, Secure, SameSite)
// - Single Session Enforcement (tokenVersion)
// - Flujo 2FA
// - JWT con datos extendidos (role, tokenVersion, lastLogin)
// ============================================================================

import { CredentialsSignin } from "next-auth";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { authConfig } from "@/lib/auth.config";

// ============================================================================
// ERRORES PERSONALIZADOS DE 2FA
// ============================================================================

/**
 * Error lanzado cuando se requiere verificación 2FA.
 * El cliente debe mostrar el campo de código 2FA.
 */
class TwoFactorRequiredError extends CredentialsSignin {
  code = "2FA_REQUIRED";
}

/**
 * Error lanzado cuando el código 2FA ingresado es inválido.
 */
class InvalidTwoFactorError extends CredentialsSignin {
  code = "2FA_INVALID";
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Genera un código numérico de 6 dígitos para 2FA.
 * @returns Código como string (ej: "123456")
 */
function generateTwoFactorCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ============================================================================
// CONFIGURACIÓN PRINCIPAL DE NEXTAUTH
// ============================================================================

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Heredar configuración base (páginas, sesión, cookies)
  ...authConfig,

  // ================================================================
  // PROVEEDORES DE AUTENTICACIÓN
  // ================================================================
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        twoFactorCode: { label: "2FA Code", type: "text" },
      },

      /**
       * Función de autorización que valida credenciales.
       * Implementa:
       * - Validación con Zod
       * - Verificación de contraseña con bcrypt
       * - Flujo 2FA mockeado
       * - Incremento de tokenVersion (Single Session)
       */
      async authorize(credentials) {
        try {
          // 1. Validar entrada con Zod
          const validatedFields = loginSchema.safeParse({
            email: credentials?.email,
            password: credentials?.password,
          });

          if (!validatedFields.success) {
            console.error(
              "❌ Validación de Zod falló:",
              validatedFields.error.format()
            );
            return null;
          }

          const { email, password } = validatedFields.data;
          console.log("🔍 Intentando login para:", email);

          // 2. Buscar usuario en la base de datos
          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user) {
            console.error("❌ Usuario no encontrado:", email);
            return null;
          }

          console.log("👤 Usuario encontrado:", user.email);

          // 3. Verificar contraseña con bcrypt
          const passwordMatch = await bcrypt.compare(password, user.password);

          if (!passwordMatch) {
            console.error("❌ Contraseña incorrecta para:", email);
            return null;
          }

          // ================================================================
          // FLUJO 2FA MOCKEADO
          // ================================================================
          const twoFactorCode = credentials?.twoFactorCode as
            | string
            | undefined;

          if (!twoFactorCode) {
            // Primer paso: generar y "enviar" código 2FA
            const newCode = generateTwoFactorCode();

            // Guardar código en la DB (temporal)
            await prisma.user.update({
              where: { id: user.id },
              data: { twoFactorSecret: newCode, twoFactorVerified: false },
            });

            // SIMULACIÓN: Imprimir código en consola del servidor
            console.log("═══════════════════════════════════════════════════");
            console.log("🔐 CÓDIGO 2FA PARA:", email);
            console.log("📧 CÓDIGO:", newCode);
            console.log("═══════════════════════════════════════════════════");

            throw new TwoFactorRequiredError();
          }

          // 4. Verificar código 2FA
          if (user.twoFactorSecret !== twoFactorCode) {
            console.error("❌ Código 2FA incorrecto para:", email);
            throw new InvalidTwoFactorError();
          }

          // ================================================================
          // LOGIN EXITOSO - ACTUALIZAR SEGURIDAD
          // ================================================================

          // Incrementar tokenVersion para invalidar sesiones anteriores
          // Esto implementa Single Session Enforcement
          const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
              twoFactorVerified: true,
              twoFactorSecret: null, // Limpiar código usado
              lastLogin: new Date(),
              tokenVersion: { increment: 1 }, // ¡CLAVE para Single Session!
            },
          });

          console.log("✅ Login exitoso para:", email);
          console.log("📊 Nueva tokenVersion:", updatedUser.tokenVersion);

          // Retornar usuario con datos extendidos para el JWT
          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.paternalSurname} ${user.maternalSurname}`,
            role: updatedUser.role,
            tokenVersion: updatedUser.tokenVersion,
            lastLogin: updatedUser.lastLogin,
          };
        } catch (error) {
          // Re-lanzar errores de 2FA para manejo en el cliente
          if (
            error instanceof TwoFactorRequiredError ||
            error instanceof InvalidTwoFactorError
          ) {
            throw error;
          }

          console.error("❌ Error en autorización:", error);
          return null;
        }
      },
    }),
  ],

  // ================================================================
  // CALLBACKS PARA JWT Y SESIÓN
  // ================================================================
  callbacks: {
    ...authConfig.callbacks,

    /**
     * Callback JWT: Persiste datos del usuario en el token.
     * Se ejecuta en cada request que necesita el token.
     */
    async jwt({ token, user }) {
      // En el primer login, agregar datos del usuario al token
      if (user) {
        token.id = user.id;
        token.email = user.email as string;
        token.name = user.name as string;
        token.role = user.role;
        token.tokenVersion = user.tokenVersion;
        token.lastLogin =
          user.lastLogin instanceof Date
            ? user.lastLogin.toISOString()
            : user.lastLogin || null;
      }
      return token;
    },

    /**
     * Callback Session: Expone datos del token al cliente.
     * Solo incluye lo necesario (no exponer tokenVersion al cliente).
     */
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.lastLogin = token.lastLogin;
        // tokenVersion NO se expone al cliente por seguridad
        // pero se mantiene en el token para validación en middleware
      }
      return session;
    },
  },
});
