// ============================================================================
// PÁGINA DE LOGIN - PRO-FINANCE
// ============================================================================
// Formulario de inicio de sesión con React Hook Form, Zod y soporte 2FA.
// ============================================================================

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { loginSchema, twoFactorSchema } from "@/lib/validations/auth";
import type { LoginFormData, TwoFactorFormData } from "@/lib/validations/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SystemHeader } from "@/components/SystemHeader";

import styles from "./page.module.css";

// ============================================================================
// TIPOS
// ============================================================================

/**
 * Estados posibles del flujo de login.
 */
type LoginStep = "credentials" | "twoFactor";

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

/**
 * Página de inicio de sesión.
 * Maneja el flujo de credenciales y verificación 2FA.
 */
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  // Estado del paso actual del login
  const [step, setStep] = useState<LoginStep>("credentials");
  const [serverError, setServerError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");

  // ================================================================
  // FORMULARIO DE CREDENCIALES
  // ================================================================
  const credentialsForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // ================================================================
  // FORMULARIO DE 2FA
  // ================================================================
  const twoFactorForm = useForm<TwoFactorFormData>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: {
      code: "",
    },
  });

  // ================================================================
  // HANDLERS
  // ================================================================

  /**
   * Maneja el envío del formulario de credenciales.
   * Si las credenciales son válidas, pasa al paso de 2FA.
   */
  const onSubmitCredentials = async (data: LoginFormData) => {
    setServerError(null);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        // En NextAuth v5, los errores custom a veces llegan como "Configuration" o "CallbackRouteError"
        // pero el código interno es el que definimos. Intentamos detectar el string en el código.
        if (
          result.code === "2FA_REQUIRED" ||
          result.error.includes("2FA_REQUIRED")
        ) {
          // Credenciales correctas, requerimos 2FA
          setEmail(data.email);
          setStep("twoFactor");
          console.log(
            "📱 Se requiere verificación 2FA. Revisa la consola del servidor."
          );
        } else if (
          result.code === "2FA_INVALID" ||
          result.error.includes("2FA_INVALID")
        ) {
          setServerError("Error en el sistema de autenticación.");
        } else if (result.error.includes("CredentialsSignin")) {
          setServerError("Correo o contraseña incorrectos.");
        } else {
          // Si es el primer paso y falló pero no es credenciales inválidas conocidas,
          // podría ser que NextAuth enmascaró el error 2FA_REQUIRED.
          // Vamos a asumir que si llegamos aquí es un error real, PERO
          // imprimiremos el error real en consola para depurar si sigue fallando.
          console.log("Login Error Raw:", result);
          setServerError("Error al iniciar sesión. Verifica tus datos.");
        }
        return;
      }

      // Login exitoso sin 2FA (no debería ocurrir con la config actual)
      router.push(callbackUrl);
      router.refresh();
    } catch (error) {
      console.error("Error en login:", error);
      setServerError("Error de conexión. Intenta de nuevo.");
    }
  };

  /**
   * Maneja el envío del código 2FA.
   */
  const onSubmit2FA = async (data: TwoFactorFormData) => {
    setServerError(null);

    try {
      const result = await signIn("credentials", {
        email: email,
        password: credentialsForm.getValues("password"),
        twoFactorCode: data.code,
        redirect: false,
      });

      if (result?.error) {
        if (
          result.code === "2FA_INVALID" ||
          result.error.includes("2FA_INVALID")
        ) {
          setServerError("Código incorrecto. Verifica e intenta de nuevo.");
        } else {
          setServerError("Error de verificación. Intenta de nuevo.");
        }
        return;
      }

      // Login exitoso
      router.push(callbackUrl);
      router.refresh();
    } catch (error) {
      console.error("Error en 2FA:", error);
      setServerError("Error de conexión. Intenta de nuevo.");
    }
  };

  /**
   * Volver al paso de credenciales.
   */
  const handleBack = () => {
    setStep("credentials");
    setServerError(null);
    twoFactorForm.reset();
  };

  // ================================================================
  // RENDER
  // ================================================================

  return (
    <>
      {/* Header del sistema */}
      <SystemHeader />

      <main className="auth-container">
        <div
          className="auth-card"
          style={{
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          {/* Header del formulario */}
          <header className="auth-header">
            <p className={styles.subtitle}>
              {step === "credentials"
                ? "Accede a tu cuenta"
                : "Verificación de seguridad"}
            </p>
          </header>

          {/* Error del servidor */}
          {serverError && (
            <div className={styles.errorAlert}>{serverError}</div>
          )}

          {/* ========== PASO 1: CREDENCIALES ========== */}
          {step === "credentials" && (
            <form
              className="auth-form"
              onSubmit={credentialsForm.handleSubmit(onSubmitCredentials)}
              noValidate
            >
              <Input
                label="Correo Electrónico"
                type="email"
                placeholder="tu@email.com"
                autoComplete="email"
                {...credentialsForm.register("email")}
                error={credentialsForm.formState.errors.email?.message}
              />

              <Input
                label="Contraseña"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                {...credentialsForm.register("password")}
                error={credentialsForm.formState.errors.password?.message}
              />

              <div className="form-actions">
                <Link href="/forgot-password" className="forgot-password">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={credentialsForm.formState.isSubmitting}
              >
                {credentialsForm.formState.isSubmitting
                  ? "VERIFICANDO..."
                  : "INICIAR SESIÓN"}
              </Button>

              <div className="auth-footer">
                ¿No tienes cuenta?
                <Link href="/register">Regístrate</Link>
              </div>
            </form>
          )}

          {/* ========== PASO 2: CÓDIGO 2FA ========== */}
          {step === "twoFactor" && (
            <form
              className="auth-form"
              onSubmit={twoFactorForm.handleSubmit(onSubmit2FA)}
              noValidate
            >
              <p className={styles.twoFactorInfo}>
                Hemos enviado un código de verificación a tu correo.
                <br />
                <strong>
                  Revisa la consola del servidor para ver el código.
                </strong>
              </p>

              <Input
                label="Código de Verificación"
                type="text"
                placeholder="123456"
                maxLength={6}
                autoComplete="one-time-code"
                {...twoFactorForm.register("code")}
                error={twoFactorForm.formState.errors.code?.message}
              />

              <Button
                type="submit"
                variant="primary"
                disabled={twoFactorForm.formState.isSubmitting}
              >
                {twoFactorForm.formState.isSubmitting
                  ? "VERIFICANDO..."
                  : "VERIFICAR CÓDIGO"}
              </Button>

              <button
                type="button"
                className={styles.backButton}
                onClick={handleBack}
              >
                ← Volver al inicio de sesión
              </button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
