"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import styles from "../login/login.module.css";

// ============================================================================
// SCHEMAS DE VALIDACIÓN
// ============================================================================
const emailSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
});

const codeSchema = z.object({
  code: z.string().min(1, "El código es requerido"),
});

const passwordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
      .regex(/[a-z]/, "Debe contener al menos una minúscula")
      .regex(/[0-9]/, "Debe contener al menos un número")
      .regex(/[^A-Za-z0-9]/, "Debe contener al menos un carácter especial"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type EmailFormData = z.infer<typeof emailSchema>;
type CodeFormData = z.infer<typeof codeSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

type Step = "email" | "verification" | "newPassword";

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [verificationToken, setVerificationToken] = useState(""); // Token temporal
  const [mode, setMode] = useState<"totp" | "recovery">("totp");
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Formularios separados para cada paso
  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  const codeForm = useForm<CodeFormData>({
    resolver: zodResolver(codeSchema),
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  // ================================================================
  // PASO 1: Verificar email
  // ================================================================
  const onSubmitEmail = async (data: EmailFormData) => {
    setServerError(null);

    try {
      // Verificar que el email existe
      const checkResponse = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      const checkData = await checkResponse.json();

      if (!checkData.exists) {
        emailForm.setError("email", {
          type: "manual",
          message: "Este correo no está registrado.",
        });
        return;
      }

      setEmail(data.email);
      setStep("verification");
    } catch (error) {
      setServerError("Error de conexión. Intenta de nuevo.");
    }
  };

  // ================================================================
  // PASO 2: Verificar código TOTP/Recovery
  // ================================================================
  const onSubmitCode = async (data: CodeFormData) => {
    setServerError(null);

    try {
      const response = await fetch("/api/auth/reset-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code: data.code,
          mode,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setServerError(
          result.message || "Código incorrecto. Verifica e intenta de nuevo."
        );
        return;
      }

      // Guardar token temporal
      setVerificationToken(result.token);
      setStep("newPassword");
    } catch (error) {
      setServerError("Error de conexión. Intenta de nuevo.");
    }
  };

  // ================================================================
  // PASO 3: Establecer nueva contraseña
  // ================================================================
  const onSubmitPassword = async (data: PasswordFormData) => {
    setServerError(null);

    try {
      const response = await fetch("/api/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          token: verificationToken,
          newPassword: data.newPassword,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setServerError(result.message || "Error al cambiar contraseña.");
        return;
      }

      setSuccessMessage("Contraseña cambiada exitosamente. Redirigiendo...");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error) {
      setServerError("Error de conexión. Intenta de nuevo.");
    }
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
            <h2 className={styles.title}>Recuperar Contraseña</h2>
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

          {/* PASO 1: EMAIL */}
          {step === "email" && (
            <form
              className={styles.customForm}
              onSubmit={emailForm.handleSubmit(onSubmitEmail)}
              noValidate
            >
              <p
                style={{
                  color: "#666",
                  marginBottom: "1.5rem",
                  fontSize: "0.9rem",
                }}
              >
                Ingresa tu correo electrónico. Verificaremos tu identidad con tu
                código 2FA.
              </p>

              <div className={styles.inputWrapper}>
                <Input
                  label="Correo Electrónico"
                  type="email"
                  placeholder="tu@email.com"
                  {...emailForm.register("email")}
                  error={emailForm.formState.errors.email?.message}
                />
              </div>

              <Button
                type="submit"
                className={styles.submitBtn}
                disabled={emailForm.formState.isSubmitting}
              >
                {emailForm.formState.isSubmitting
                  ? "Verificando..."
                  : "Continuar"}
              </Button>

              <div style={{ textAlign: "center", marginTop: "1rem" }}>
                <Link href="/login" className={styles.link}>
                  ← Volver al inicio de sesión
                </Link>
              </div>
            </form>
          )}

          {/* PASO 2: VERIFICACIÓN 2FA */}
          {step === "verification" && (
            <form
              className={styles.customForm}
              onSubmit={codeForm.handleSubmit(onSubmitCode)}
            >
              <h3
                style={{
                  fontSize: "1.1rem",
                  color: "black",
                  marginBottom: "10px",
                  textAlign: "center",
                }}
              >
                {mode === "totp"
                  ? "Verificación de Identidad"
                  : "Código de Recuperación"}
              </h3>

              <p
                style={{
                  color: "#666",
                  marginBottom: "1.5rem",
                  textAlign: "center",
                  fontSize: "0.9rem",
                }}
              >
                {mode === "totp"
                  ? "Ingresa el código de tu aplicación de autenticación."
                  : "Ingresa uno de tus códigos de recuperación de emergencia."}
              </p>

              <div className={styles.inputWrapper}>
                <Input
                  label={
                    mode === "totp" ? "Código TOTP" : "Código de Recuperación"
                  }
                  type="text"
                  placeholder={mode === "totp" ? "123456" : "XXXXX-XXXXX"}
                  maxLength={mode === "totp" ? 6 : undefined}
                  {...codeForm.register("code")}
                  error={codeForm.formState.errors.code?.message}
                  style={
                    mode === "recovery"
                      ? { letterSpacing: "2px", textTransform: "uppercase" }
                      : { letterSpacing: "5px", textAlign: "center" }
                  }
                />
              </div>

              <Button
                type="submit"
                className={styles.submitBtn}
                disabled={codeForm.formState.isSubmitting}
              >
                {codeForm.formState.isSubmitting
                  ? "Verificando..."
                  : "Verificar"}
              </Button>

              <div style={{ textAlign: "center", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setMode(mode === "totp" ? "recovery" : "totp")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#bd8e48",
                    textDecoration: "underline",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  {mode === "totp"
                    ? "¿Perdiste acceso a tu autenticador?"
                    : "Usar código de autenticador"}
                </button>
              </div>
            </form>
          )}

          {/* PASO 3: NUEVA CONTRASEÑA */}
          {step === "newPassword" && (
            <form
              className={styles.customForm}
              onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
            >
              <p
                style={{
                  color: "#666",
                  marginBottom: "1.5rem",
                  fontSize: "0.9rem",
                }}
              >
                Ingresa tu nueva contraseña. Debe ser segura y diferente a la
                anterior.
              </p>

              <div className={styles.inputWrapper}>
                <Input
                  label="Nueva Contraseña"
                  type="password"
                  placeholder="••••••••"
                  {...passwordForm.register("newPassword")}
                  error={passwordForm.formState.errors.newPassword?.message}
                />
              </div>

              <div className={styles.inputWrapper}>
                <Input
                  label="Confirmar Contraseña"
                  type="password"
                  placeholder="••••••••"
                  {...passwordForm.register("confirmPassword")}
                  error={passwordForm.formState.errors.confirmPassword?.message}
                />
              </div>

              <Button
                type="submit"
                className={styles.submitBtn}
                disabled={passwordForm.formState.isSubmitting}
              >
                {passwordForm.formState.isSubmitting
                  ? "Guardando..."
                  : "Cambiar Contraseña"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
