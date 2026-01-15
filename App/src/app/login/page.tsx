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

import styles from "./login.module.css";

// ============================================================================
// TIPOS
// ============================================================================
type LoginStep = "credentials" | "twoFactor";

// ============================================================================
// COMPONENTE: PASO DE 2FA / RECOVERY
// ============================================================================
function LoginForm2FAStep({
  email,
  password,
  callbackUrl,
  onBack,
  defaultMode = "totp",
}: {
  email: string;
  password: string;
  callbackUrl: string;
  onBack: () => void;
  defaultMode?: "totp" | "recovery";
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"totp" | "recovery">(defaultMode);
  const [serverError, setServerError] = useState<string | null>(null);
  const [trustDevice, setTrustDevice] = useState(true); // Checkbox para confiar en dispositivo

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { code: "" },
  });

  const onSubmit = async (data: { code: string }) => {
    setServerError(null);

    try {
      // Preparamos las credenciales según el modo
      const credentials = {
        email,
        password,
        redirect: false,
        ...(mode === "totp"
          ? { twoFactorCode: data.code }
          : { recoveryCode: data.code }),
      };

      const result = (await signIn("credentials", credentials as any)) as
        | {
            error: string;
            code?: string;
            ok: boolean;
            status: number;
            url: string | null;
          }
        | undefined;

      if (result?.error) {
        // Mensaje específico si es Recovery Code y excedió límites
        if (
          result.error.includes("espera 1 hora") ||
          result.code === "RATE_LIMIT"
        ) {
          setServerError(
            "Límite de intentos excedido. Por favor espera 1 hora."
          );
        } else {
          setServerError(
            mode === "totp"
              ? "Código incorrecto. Verifica tu autenticador."
              : "Código inválido o ya usado."
          );
        }
        return;
      }

      // ================================================================
      // Si login TOTP exitoso y checkbox marcado, crear dispositivo confiable
      // ================================================================
      if (mode === "totp" && trustDevice) {
        try {
          await fetch("/api/auth/trusted-device", {
            method: "POST",
          });
          console.log("✅ Dispositivo marcado como confiable por 30 días");
        } catch (e) {
          console.error("Error creando dispositivo confiable:", e);
          // No bloquear login si falla
        }
      }

      // Verificación de redirección basada en roles
      try {
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();

        if (session?.user?.role) {
          const role = session.user.role;
          let targetUrl = callbackUrl;

          if (callbackUrl === "/dashboard") {
            if (role === "SUPER_ADMIN") targetUrl = "/superadmin";
            else if (role === "ADMIN") targetUrl = "/admin";
            else targetUrl = "/dashboard";
          }

          router.push(targetUrl);
          router.refresh();
          return;
        }
      } catch (e) {
        console.error("Error fetching session for redirect", e);
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (error) {
      console.error("Error en Auth:", error);
      setServerError("Error de conexión.");
    }
  };

  return (
    <form className={styles.customForm} onSubmit={handleSubmit(onSubmit)}>
      <h3
        style={{
          fontSize: "1.2rem",
          color: "black",
          marginBottom: "10px",
          textAlign: "center",
        }}
      >
        {mode === "totp"
          ? "Autenticación de Dos Factores"
          : "Recuperación de Cuenta"}
      </h3>

      <p
        style={{
          color: "black",
          marginBottom: "1.5rem",
          textAlign: "center",
          fontSize: "0.9rem",
        }}
      >
        {mode === "totp"
          ? "Ingresa el código de 6 dígitos de tu aplicación de autenticación."
          : "Ingresa uno de tus códigos de recuperación de emergencia."}
      </p>

      {serverError && (
        <div className={styles.errorAlert} style={{ marginBottom: "15px" }}>
          {serverError}
        </div>
      )}

      <div className={styles.inputWrapper}>
        <Input
          label={mode === "totp" ? "Código TOTP" : "Código de Recuperación"}
          type="text"
          placeholder={mode === "totp" ? "123456" : "XXXXX-XXXXX"}
          maxLength={mode === "totp" ? 6 : undefined}
          {...register("code", { required: "El código es requerido" })}
          error={errors.code?.message}
          style={
            mode === "recovery"
              ? { letterSpacing: "2px", textTransform: "uppercase" }
              : { letterSpacing: "5px", textAlign: "center" }
          }
        />
      </div>

      {/* Checkbox para confiar en dispositivo (solo en modo TOTP) */}
      {mode === "totp" && (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.85rem",
            color: "#333",
            cursor: "pointer",
            marginBottom: "1rem",
          }}
        >
          <input
            type="checkbox"
            checked={trustDevice}
            onChange={(e) => setTrustDevice(e.target.checked)}
            style={{
              width: "16px",
              height: "16px",
              cursor: "pointer",
            }}
          />
          Confiar en este dispositivo por 30 días
        </label>
      )}

      <Button
        type="submit"
        className={styles.submitBtn}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Verificando..." : "Verificar"}
      </Button>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginTop: "1rem",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setMode(mode === "totp" ? "recovery" : "totp");
            setServerError(null);
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#bd8e48",
            fontSize: "0.85rem",
            textDecoration: "underline",
          }}
        >
          {mode === "totp"
            ? defaultMode === "totp"
              ? "¿Perdiste acceso a tu autenticador?"
              : "Ingresar código TOTP"
            : "Usar código de autenticador"}
        </button>

        <button
          type="button"
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#666",
            fontSize: "0.85rem",
            marginTop: "0.5rem",
          }}
        >
          ← Volver al inicio de sesión
        </button>
      </div>
    </form>
  );
}

// ============================================================================
// COMPONENTE INTERNO
// ============================================================================
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const setupComplete = searchParams.get("setupComplete") === "true";

  const [step, setStep] = useState<LoginStep>("credentials");
  const [twoFactorDefaultMode, setTwoFactorDefaultMode] = useState<
    "totp" | "recovery"
  >("totp");
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    setupComplete
      ? "¡Configuración de seguridad completada! Inicia sesión para continuar."
      : null
  );
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

  // (twoFactorForm ya no es necesario aquí arriba porque se mueve a LoginForm2FAStep, pero lo dejaré limpio)

  // ================================================================
  // HANDLERS
  // ================================================================
  const onSubmitCredentials = async (data: LoginFormData) => {
    setServerError(null);

    try {
      // ================================================================
      // Paso 1: Verificar si este dispositivo es confiable para el usuario
      // ================================================================
      let trustedDeviceToken: string | undefined;

      try {
        const checkResponse = await fetch("/api/auth/check-trusted-device", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: data.email }),
        });
        const checkData = await checkResponse.json();

        if (checkData.trusted && checkData.deviceToken) {
          trustedDeviceToken = checkData.deviceToken;
          console.log("🔓 Dispositivo confiable detectado, omitiendo TOTP");
        }
      } catch (e) {
        console.error("Error verificando dispositivo confiable:", e);
        // Continuar sin token de dispositivo
      }

      // ================================================================
      // Paso 2: Intentar login con credenciales (y token de dispositivo si existe)
      // ================================================================
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        trustedDeviceToken, // Enviar token si existe
        redirect: false,
      });

      if (result?.error) {
        if (
          result.code === "2FA_REQUIRED" ||
          result.error.includes("2FA_REQUIRED")
        ) {
          setEmail(data.email);
          setStep("twoFactor");
          console.log("📱 Se requiere código TOTP del autenticador.");
        } else if (result.error.includes("CredentialsSignin")) {
          setServerError("Correo o contraseña incorrectos.");
        } else {
          console.log("Login Error Raw:", result);
          setServerError("Error al iniciar sesión. Verifica tus datos.");
        }
        return;
      }

      // Verificación de redirección basada en roles después de login exitoso
      try {
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();

        if (session?.user?.role) {
          const role = session.user.role;
          let targetUrl = callbackUrl;

          // Only override callbackUrl if it is the default "/dashboard"
          if (callbackUrl === "/dashboard") {
            if (role === "SUPER_ADMIN") targetUrl = "/superadmin";
            else if (role === "ADMIN") targetUrl = "/admin";
            else targetUrl = "/dashboard";
          }

          router.push(targetUrl);
          router.refresh();
          return;
        }
      } catch (e) {
        console.error("Error fetching session for redirect", e);
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (error) {
      console.error("Error en login:", error);
      setServerError("Error de conexión. Intenta de nuevo.");
    }
  };

  const handleBack = () => {
    setStep("credentials");
    setServerError(null);
    setTwoFactorDefaultMode("totp");
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
              <Link href="/register" className={styles.switchBtn}>
                Registrarse
              </Link>
            </div>
            <h2 className={styles.title}>Iniciar Sesión</h2>
          </div>

          {successMessage && (
            <div
              style={{
                padding: "12px 16px",
                background: "rgba(76, 175, 80, 0.1)",
                border: "1px solid rgba(76, 175, 80, 0.3)",
                borderRadius: "12px",
                color: "#4caf50",
                fontSize: "0.9rem",
                marginBottom: "16px",
                textAlign: "center",
              }}
            >
              {successMessage}
            </div>
          )}

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

          {/* 2FA STEP */}
          {step === "twoFactor" && (
            <LoginForm2FAStep
              email={email}
              password={credentialsForm.getValues("password")}
              callbackUrl={callbackUrl}
              onBack={handleBack}
              defaultMode={twoFactorDefaultMode}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL WRAPPER
// ============================================================================
export default function LoginPage() {
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
      <LoginContent />
    </Suspense>
  );
}
