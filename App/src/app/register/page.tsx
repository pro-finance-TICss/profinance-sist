"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { registerSchema } from "@/lib/validations/auth";
import type { RegisterFormData } from "@/lib/validations/auth";
import { registerUser, confirmTotpSetup } from "@/lib/actions/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { TotpSetup } from "@/components/auth/TotpSetup";

import styles from "./register.module.css";

// ============================================================================
// TIPOS
// ============================================================================

/** Pasos del flujo de registro */
type RegisterStep = "form" | "totp" | "success";

/** Datos de configuración TOTP recibidos del servidor */
interface TotpSetupData {
  qrCode: string;
  secret: string;
  userId: string;
}

// ============================================================================
// COMPONENTE PRINCIPAL DE REGISTRO
// ============================================================================

export default function RegisterPage() {
  const router = useRouter();

  // Estados del flujo
  const [step, setStep] = useState<RegisterStep | "recovery">("form");
  const [serverError, setServerError] = useState<string | null>(null);
  const [totpData, setTotpData] = useState<TotpSetupData | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  // Formulario con validación Zod
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      paternalSurname: "",
      maternalSurname: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // ================================================================
  // HANDLERS
  // ================================================================

  /**
   * Maneja el envío del formulario de registro.
   * Si es exitoso, pasa al paso de configuración TOTP.
   */
  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);

    try {
      const result = await registerUser(data);

      if (!result.success) {
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, messages]) => {
            setError(field as keyof RegisterFormData, {
              type: "server",
              message: messages[0],
            });
          });
        }
        setServerError(result.message);
        return;
      }

      // Registro exitoso - Pasar a configuración TOTP
      if (result.totpSetup) {
        setTotpData(result.totpSetup);
        setStep("totp");
      }
    } catch (error) {
      console.error("Error en registro:", error);
      setServerError("Error de conexión.");
    }
  };

  /**
   * Verifica el código TOTP ingresado por el usuario.
   */
  const handleTotpVerify = async (code: string) => {
    if (!totpData) {
      return { success: false, message: "Error: datos de TOTP no disponibles" };
    }

    const result = await confirmTotpSetup(totpData.userId, code);

    if (result.success && result.recoveryCodes) {
      setRecoveryCodes(result.recoveryCodes);
      // No llamar onSuccess aquí, dejar que TotpSetup lo maneje
    }

    return result;
  };

  /**
   * Callback cuando la verificación TOTP es exitosa.
   */
  const handleTotpSuccess = () => {
    // Si tenemos códigos de recuperación, los mostramos
    if (recoveryCodes.length > 0) {
      setStep("recovery");
    } else {
      // Si por alguna razón no hay códigos, vamos directo a success
      setStep("success");
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    }
  };

  const handleFinishRecovery = () => {
    setStep("success");
    setTimeout(() => {
      router.push("/login");
    }, 2500);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    alert("Códigos copiados al portapapeles");
  };

  // ================================================================
  // RENDER
  // ================================================================

  return (
    <div className={styles.container}>
      {/* BRANDING SECTION */}
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

      {/* FORM SECTION */}
      <div className={styles.formSection}>
        <div className={styles.formContainer} style={{ maxWidth: "550px" }}>
          {/* HEADER - Solo mostrar en paso de formulario */}
          {step === "form" && (
            <div className={styles.formHeader}>
              <div className={styles.topSwitch}>
                <Link href="/login" className={styles.switchBtn}>
                  Iniciar Sesión
                </Link>
                <a
                  href="#"
                  className={`${styles.switchBtn} ${styles.switchBtnActive}`}
                >
                  Registrarse
                </a>
              </div>
              <h2 className={styles.title}>Registrarse</h2>
            </div>
          )}

          {/* PASO 1: FORMULARIO DE REGISTRO */}
          {step === "form" && (
            <>
              {serverError && (
                <div className={styles.errorAlert}>{serverError}</div>
              )}

              <form
                className={styles.customForm}
                onSubmit={handleSubmit(onSubmit)}
              >
                <div className={styles.inputWrapper}>
                  <Input
                    label="Nombre(s)"
                    type="text"
                    placeholder="Tu nombre"
                    {...register("firstName")}
                    error={errors.firstName?.message}
                  />
                </div>

                <div style={{ display: "flex", gap: "1rem" }}>
                  <div className={styles.inputWrapper} style={{ flex: 1 }}>
                    <Input
                      label="Apellido Paterno"
                      type="text"
                      placeholder="Paterno"
                      {...register("paternalSurname")}
                      error={errors.paternalSurname?.message}
                    />
                  </div>
                  <div className={styles.inputWrapper} style={{ flex: 1 }}>
                    <Input
                      label="Apellido Materno"
                      type="text"
                      placeholder="Materno"
                      {...register("maternalSurname")}
                      error={errors.maternalSurname?.message}
                    />
                  </div>
                </div>

                <div className={styles.inputWrapper}>
                  <Input
                    label="Correo Electrónico"
                    type="email"
                    placeholder="tu@email.com"
                    {...register("email")}
                    error={errors.email?.message}
                  />
                </div>

                <div className={styles.inputWrapper}>
                  <Input
                    label="Contraseña"
                    type="password"
                    placeholder="••••••••"
                    {...register("password")}
                    error={errors.password?.message}
                  />
                </div>

                <div className={styles.inputWrapper}>
                  <Input
                    label="Confirmar Contraseña"
                    type="password"
                    placeholder="••••••••"
                    {...register("confirmPassword")}
                    error={errors.confirmPassword?.message}
                  />
                </div>

                <div style={{ fontSize: "0.8rem", color: "rgba(0,0,0,0.5)" }}>
                  La contraseña debe tener 8+ caracteres, mayúscula, número y
                  símbolo.
                </div>

                <div style={{ marginTop: "1rem" }}>
                  <label
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      alignItems: "flex-start",
                      fontSize: "0.9rem",
                      color: "rgba(0,0,0,0.7)",
                    }}
                  >
                    <input
                      type="checkbox"
                      style={{
                        marginTop: "0.2rem",
                        accentColor: "var(--color-gold-start)",
                      }}
                    />
                    <span>
                      Acepto los{" "}
                      <a href="#" className={styles.link}>
                        términos y condiciones
                      </a>{" "}
                      de servicio.
                    </span>
                  </label>
                </div>

                <Button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Registrando..." : "Continuar"}
                </Button>
              </form>

              <div
                style={{
                  marginTop: "2rem",
                  textAlign: "center",
                  color: "rgba(0,0,0,0.6)",
                  fontSize: "0.9rem",
                }}
              >
                ¿Ya eres miembro?{" "}
                <Link href="/login" className={styles.link}>
                  Inicia Sesión
                </Link>
              </div>
            </>
          )}

          {/* PASO 2: CONFIGURACIÓN TOTP */}
          {step === "totp" && totpData && (
            <TotpSetup
              qrCode={totpData.qrCode}
              secret={totpData.secret}
              onVerify={handleTotpVerify}
              onSuccess={handleTotpSuccess}
              title="Configura tu Autenticador"
            />
          )}

          {/* PASO 3: CÓDIGOS DE RECUPERACIÓN */}
          {step === "recovery" && (
            <div
              style={{
                background: "rgba(255, 255, 255, 0.9)",
                padding: "2rem",
                borderRadius: "12px",
                textAlign: "center",
              }}
            >
              <h3 style={{ color: "#333", marginBottom: "1rem" }}>
                ¡IMPORTANTE! Guada estos códigos
              </h3>
              <p
                style={{
                  color: "#666",
                  marginBottom: "1.5rem",
                  fontSize: "0.9rem",
                }}
              >
                Si pierdes acceso a tu autenticador, estos códigos serán la
                ÚNICA forma de recuperar tu cuenta. Guárdalos en un lugar
                seguro.
              </p>

              <div
                style={{
                  background: "#f5f5f5",
                  padding: "1rem",
                  borderRadius: "8px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.5rem",
                  marginBottom: "1.5rem",
                  border: "1px solid #ddd",
                }}
              >
                {recoveryCodes.map((code, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontFamily: "monospace",
                      fontSize: "1rem",
                      padding: "0.25rem",
                      color: "#333",
                    }}
                  >
                    {code}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: "1rem" }}>
                <Button
                  onClick={copyToClipboard}
                  className={styles.submitBtn}
                  style={{
                    backgroundColor: "#6c757d",
                    backgroundImage: "none",
                  }}
                >
                  Copiar Códigos
                </Button>
                <Button
                  onClick={handleFinishRecovery}
                  className={styles.submitBtn}
                >
                  He guardado mis códigos
                </Button>
              </div>
            </div>
          )}

          {/* PASO 4: ÉXITO */}
          {step === "success" && (
            <div
              style={{
                textAlign: "center",
                padding: "2rem",
              }}
            >
              <div
                style={{
                  fontSize: "4rem",
                  marginBottom: "1rem",
                }}
              >
                ✅
              </div>
              <h2
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: "#28a745",
                  marginBottom: "1rem",
                }}
              >
                ¡Cuenta Creada Exitosamente!
              </h2>
              <p
                style={{
                  color: "rgba(0,0,0,0.6)",
                  marginBottom: "1rem",
                }}
              >
                Tu autenticador ha sido configurado. Redirigiendo al inicio de
                sesión...
              </p>
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  border: "4px solid #bd8e48",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto",
                }}
              />
              <style>
                {`
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                `}
              </style>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
