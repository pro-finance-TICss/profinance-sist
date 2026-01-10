"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { loginSchema, twoFactorSchema } from "@/lib/validations/auth";
import type { LoginFormData, TwoFactorFormData } from "@/lib/validations/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

import styles from "./login2.module.css";

// ============================================================================
// TIPOS
// ============================================================================
type LoginStep = "credentials" | "twoFactor";

// ============================================================================
// COMPONENTE INTERNO
// ============================================================================
function Login2Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

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
  const onSubmitCredentials = async (data: LoginFormData) => {
    setServerError(null);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        if (
          result.code === "2FA_REQUIRED" ||
          result.error.includes("2FA_REQUIRED")
        ) {
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
          console.log("Login Error Raw:", result);
          setServerError("Error al iniciar sesión. Verifica tus datos.");
        }
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (error) {
      console.error("Error en login:", error);
      setServerError("Error de conexión. Intenta de nuevo.");
    }
  };

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
        setServerError(
          result.code === "2FA_INVALID" || result.error.includes("2FA_INVALID")
            ? "Código incorrecto."
            : "Error de verificación."
        );
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (error) {
      console.error("Error en 2FA:", error);
      setServerError("Error de conexión.");
    }
  };

  const handleBack = () => {
    setStep("credentials");
    setServerError(null);
    twoFactorForm.reset();
  };

  // ================================================================
  // RENDER
  // ================================================================
  return (
    <div className={styles.container}>
      {/* COLUMNA IZQUIERDA: BRANDING */}
      <div className={styles.brandingSection}>
        <div className={styles.brandingContent}>
          <h1 className={styles.brandingTitle}>PRO-FINANCE</h1>
          <img
            src="/Background-recortado.png"
            alt="ProFinance Logo"
            className={styles.logo}
            style={{ borderRadius: "20%" }}
          />
          <p className={styles.brandingTagline}>
            Empoderando tu futuro financiero
          </p>
        </div>
      </div>

      {/* COLUMNA DERECHA: FORMULARIO */}
      <div className={styles.formSection}>
        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <div className={styles.topSwitch}>
              <a
                href="#"
                className={`${styles.switchBtn} ${styles.switchBtnActive}`}
              >
                Iniciar Sesión
              </a>
              <Link href="/register2" className={styles.switchBtn}>
                Registrarse
              </Link>
            </div>
            <h2 className={styles.title}>Iniciar Sesión</h2>
          </div>

          {serverError && (
            <div className={styles.errorAlert}>{serverError}</div>
          )}

          {step === "credentials" && (
            <form
              className={styles.customForm}
              onSubmit={credentialsForm.handleSubmit(onSubmitCredentials)}
              noValidate
            >
              <div className={styles.inputWrapper}>
                <Input
                  label="Correo Electrónico"
                  type="email"
                  placeholder="tu@email.com"
                  {...credentialsForm.register("email")}
                  error={credentialsForm.formState.errors.email?.message}
                />
              </div>

              <div className={styles.inputWrapper}>
                <Input
                  label="Contraseña"
                  type="password"
                  placeholder="••••••••"
                  {...credentialsForm.register("password")}
                  error={credentialsForm.formState.errors.password?.message}
                />
              </div>

              <Button
                type="submit"
                className={styles.submitBtn}
                disabled={credentialsForm.formState.isSubmitting}
              >
                {credentialsForm.formState.isSubmitting
                  ? "Verificando..."
                  : "Iniciar Sesión"}
              </Button>

              <div
                className={styles.toggleContainer}
                style={{ justifyContent: "flex-end" }}
              >
                <Link href="/forgot-password" className={styles.link}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </form>
          )}

          {step === "twoFactor" && (
            <form
              className={styles.customForm}
              onSubmit={twoFactorForm.handleSubmit(onSubmit2FA)}
            >
              <p style={{ color: "rgba(0,0,0,0.6)", marginBottom: "1rem" }}>
                Ingresa el código enviado a <strong>{email}</strong>
              </p>

              <div className={styles.inputWrapper}>
                <Input
                  label="Código 2FA"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  {...twoFactorForm.register("code")}
                  error={twoFactorForm.formState.errors.code?.message}
                />
              </div>

              <Button
                type="submit"
                className={styles.submitBtn}
                disabled={twoFactorForm.formState.isSubmitting}
              >
                Verificar
              </Button>

              <button
                type="button"
                onClick={handleBack}
                className={styles.link}
                style={{
                  background: "none",
                  border: "none",
                  marginTop: "1rem",
                  cursor: "pointer",
                }}
              >
                Volver
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL WRAPPER
// ============================================================================
export default function Login2Page() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            height: "100vh",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
          }}
        >
          Cargando...
        </div>
      }
    >
      <Login2Content />
    </Suspense>
  );
}
