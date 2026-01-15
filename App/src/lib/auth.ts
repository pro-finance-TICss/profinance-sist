// ============================================================================
// CONFIGURACIÓN DE NEXTAUTH v5 - PRO-FINANCE (SEGURIDAD BANCARIA)
// ============================================================================
// Configuración central de autenticación con:
// - Cookies seguras (HttpOnly, Secure, SameSite)
// - Single Session Enforcement (tokenVersion)
// - Flujo TOTP (Time-based One-Time Password)
// - JWT con datos extendidos (role, tokenVersion, lastLogin)
// ============================================================================

import { CredentialsSignin } from "next-auth";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { authConfig } from "@/lib/auth.config";
import { verifyTotpToken } from "@/lib/totp";

import { verifyRecoveryCode } from "@/lib/actions/recovery-codes";

// ============================================================================
// ERRORES PERSONALIZADOS DE 2FA
// ============================================================================

/**
 * Error lanzado cuando se requiere verificación TOTP.
 * El cliente debe mostrar el campo de código TOTP.
 */
class TwoFactorRequiredError extends CredentialsSignin {
  code = "2FA_REQUIRED";
}

/**
 * Error lanzado cuando el código TOTP ingresado es inválido.
 */
class InvalidTwoFactorError extends CredentialsSignin {
  code = "2FA_INVALID";
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
        twoFactorCode: { label: "TOTP Code", type: "text" },
        recoveryCode: { label: "Recovery Code", type: "text" },
        trustedDeviceToken: { label: "Trusted Device Token", type: "text" },
      },

      /**
       * Función de autorización que valida credenciales.
       * Implementa:
       * - Validación con Zod
       * - Verificación de contraseña con bcrypt
       * - Verificación de dispositivo confiable (omite TOTP si válido)
       * - Verificación TOTP (obligatorio para usuarios nuevos, opcional para legacy)
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
          // VERIFICACIÓN TOTP / RECOVERY CODE / DISPOSITIVO CONFIABLE
          // ================================================================
          const totpCode = credentials?.twoFactorCode as string | undefined;
          const recoveryCode = credentials?.recoveryCode as string | undefined;
          const trustedDeviceToken = credentials?.trustedDeviceToken as
            | string
            | undefined;

          // Verificar si el usuario tiene TOTP habilitado
          if (user.totpEnabled && user.totpSecret) {
            // Caso 0: Verificar si es un dispositivo confiable
            if (trustedDeviceToken) {
              const trustedDevice = await prisma.trustedDevice.findFirst({
                where: {
                  deviceToken: trustedDeviceToken,
                  userId: user.id,
                  expiresAt: { gt: new Date() },
                },
              });

              if (trustedDevice) {
                console.log(
                  "🔓 Dispositivo confiable verificado, omitiendo TOTP"
                );
                // Actualizar última actividad
                await prisma.trustedDevice.update({
                  where: { id: trustedDevice.id },
                  data: { lastUsedAt: new Date() },
                });
                // Saltar verificación TOTP - dispositivo confiable
              } else {
                // Token inválido o expirado, requerir TOTP
                console.log(
                  "📱 Token de dispositivo inválido, se requiere TOTP"
                );
                throw new TwoFactorRequiredError();
              }
            }
            // Caso 1: Usuario intenta entrar con Recovery Code
            else if (recoveryCode) {
              console.log(
                "🚑 Intentando acceso con Recovery Code para:",
                email
              );
              const verification = await verifyRecoveryCode(
                user.id,
                recoveryCode
              );

              if (!verification.success) {
                console.error(
                  "❌ Recovery Code inválido:",
                  verification.message
                );
                throw new Error(
                  verification.message || "Código de recuperación inválido."
                );
              }

              console.log("✅ Acceso concedido por Recovery Code");
              // Nota: verifyRecoveryCode ya incrementa tokenVersion e invalida sesiones
            }
            // Caso 2: Usuario intenta entrar con TOTP (flujo normal)
            else if (totpCode) {
              // Verificar código TOTP
              if (!verifyTotpToken(totpCode, user.totpSecret)) {
                console.error("❌ Código TOTP inválido para:", email);
                throw new InvalidTwoFactorError();
              }
              console.log("✅ Código TOTP verificado para:", email);
            }
            // Caso 3: No envió ningún código
            else {
              console.log("📱 Se requiere código TOTP para:", email);
              throw new TwoFactorRequiredError();
            }
          } else {
            // Usuario legacy sin TOTP - permitir login sin 2FA
            // Esto aplica para usuarios admin y test existentes
            console.log(
              "⚠️ Usuario sin TOTP habilitado, permitiendo acceso:",
              email
            );
          }

          // ================================================================
          // LOGIN EXITOSO - ACTUALIZAR SEGURIDAD
          // ================================================================

          // Incrementar tokenVersion para invalidar sesiones anteriores
          // Esto implementa Single Session Enforcement
          const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
              lastLogin: new Date(),
              tokenVersion: { increment: 1 }, // ¡CLAVE para Single Session!
            },
          });

          console.log("✅ Login exitoso para:", email);
          console.log("📊 Nueva tokenVersion:", updatedUser.tokenVersion);

          // Determinar si el usuario necesita completar configuración de seguridad
          // Solo aplica a ADMIN y SUPER_ADMIN
          const isPrivileged =
            user.role === "ADMIN" || user.role === "SUPER_ADMIN";
          const requiresSecuritySetup =
            isPrivileged && (!user.totpEnabled || user.mustChangePassword);

          // Retornar usuario con datos extendidos para el JWT
          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.paternalSurname} ${user.maternalSurname}`,
            role: updatedUser.role,
            tokenVersion: updatedUser.tokenVersion,
            lastLogin: updatedUser.lastLogin,
            // Campos para setup de seguridad
            requiresSecuritySetup,
            totpEnabled: user.totpEnabled,
            mustChangePassword: user.mustChangePassword,
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
        // Campos para setup de seguridad obligatoria
        token.requiresSecuritySetup = user.requiresSecuritySetup;
        token.totpEnabled = user.totpEnabled;
        token.mustChangePassword = user.mustChangePassword;
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
        // Exponer si necesita setup de seguridad (para redirección en cliente)
        session.user.requiresSecuritySetup = token.requiresSecuritySetup;
        // tokenVersion NO se expone al cliente por seguridad
        // pero se mantiene en el token para validación en middleware
      }
      return session;
    },
  },
});
