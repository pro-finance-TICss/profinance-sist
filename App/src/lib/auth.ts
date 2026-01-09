// ============================================================================
// CONFIGURACIÓN DE NEXTAUTH v5
// ============================================================================
// Configuración central de autenticación usando CredentialsProvider.
// Incluye manejo de 2FA mockeado y callbacks de sesión/JWT.
// ============================================================================

import { CredentialsSignin } from "next-auth";

/**
 * Error lanzado cuando se requiere 2FA.
 */
class TwoFactorRequiredError extends CredentialsSignin {
  code = "2FA_REQUIRED";
}

/**
 * Error lanzado cuando el código 2FA es inválido.
 */
class InvalidTwoFactorError extends CredentialsSignin {
  code = "2FA_INVALID";
}

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";

/**
 * Genera un código de 6 dígitos para 2FA.
 * @returns Código numérico de 6 dígitos como string
 */
function generateTwoFactorCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Configuración de NextAuth con CredentialsProvider.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  // Páginas personalizadas
  pages: {
    signIn: "/login",
    error: "/login",
  },

  // Configuración de sesión
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 horas
  },

  // Proveedores de autenticación
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
       * Maneja el flujo de login y verificación 2FA.
       */
      async authorize(credentials) {
        try {
          // Validar entrada con Zod
          const validatedFields = loginSchema.safeParse({
            email: credentials?.email,
            password: credentials?.password,
          });

          if (!validatedFields.success) {
            return null;
          }

          const { email, password } = validatedFields.data;

          // Buscar usuario en la base de datos
          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user) {
            return null;
          }

          // Verificar contraseña con bcrypt
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

            // Indicar que se requiere 2FA usando el error personalizado
            throw new TwoFactorRequiredError();
          }

          // Segundo paso: verificar código 2FA
          if (user.twoFactorSecret !== twoFactorCode) {
            console.error("❌ Código 2FA incorrecto para:", email);
            throw new InvalidTwoFactorError();
          }

          // Código correcto: marcar como verificado y actualizar lastLogin
          await prisma.user.update({
            where: { id: user.id },
            data: {
              twoFactorVerified: true,
              twoFactorSecret: null, // Limpiar código usado
              lastLogin: new Date(),
            },
          });

          console.log("✅ Login exitoso para:", email);

          // Retornar usuario para la sesión
          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.paternalSurname} ${user.maternalSurname}`,
          };
        } catch (error) {
          // Re-lanzar nuestros errores personalizados para que lleguen al cliente
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

  // Callbacks para personalizar JWT y sesión
  callbacks: {
    /**
     * Callback JWT: agrega información del usuario al token.
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },

    /**
     * Callback Session: expone datos del token en la sesión del cliente.
     */
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
});
