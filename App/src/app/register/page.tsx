"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { registerSchema } from "@/lib/validations/auth";
import type { RegisterFormData } from "@/lib/validations/auth";
import { registerUser, confirmTotpSetup } from "@/lib/actions/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { TotpSetup } from "@/components/auth/TotpSetup";

import styles from "./register.module.css";
import { logger } from "@/lib/logger";

// ============================================================================
// TIPOS
// ============================================================================

/** Pasos del flujo de registro */
type RegisterStep = "personal-info" | "security" | "totp" | "success";

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
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref") ?? undefined;

  // Estados del flujo
  const [step, setStep] = useState<RegisterStep | "recovery">("personal-info");
  const [serverError, setServerError] = useState<string | null>(null);
  const [totpData, setTotpData] = useState<TotpSetupData | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  // Formulario con validación Zod
  const {
    register,
    handleSubmit,
    trigger,
    getValues,
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
      terms: false,
    },
  });

  // ================================================================
  // HANDLERS
  // ================================================================

  /**
   * Valida paso 1 antes de avanzar.
   * Incluye verificación de que el email no esté registrado.
   */
  const handleNextStep = async () => {
    // Primero validar los campos con Zod
    const isValid = await trigger([
      "firstName",
      "paternalSurname",
      "maternalSurname",
      "email",
    ]);

    if (!isValid) {
      return;
    }

    // Verificar si el correo ya está registrado
    try {
      const currentEmail = getValues("email");
      const response = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentEmail }),
      });

      const data = await response.json();

      if (data.exists) {
        setError("email", {
          type: "manual",
          message: "Este correo ya está registrado.",
        });
        return;
      }

      // Email disponible, avanzar al siguiente paso
      setStep("security");
    } catch (error) {
      logger.error("Error verificando email:", error);
      setServerError("Error de conexión. Intenta de nuevo.");
    }
  };

  /**
   * Maneja el envío del formulario de registro.
   * Si es exitoso, pasa al paso de configuración TOTP.
   */
  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);

    try {
      const result = await registerUser(data, referralCode);

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
      logger.error("Error en registro:", error);
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
    // Siempre vamos a recovery codes porque confirmTotpSetup siempre los genera
    setStep("recovery");
  };

  const handleFinishRecovery = () => {
    setStep("success");
    setTimeout(() => {
      router.push("/login");
    }, 2500);
  };

  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
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
          {/* HEADER - Mostrar en pasos de formulario */}
          {(step === "personal-info" || step === "security") && (
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

          {/* FORMULARIO DE REGISTRO (Paso 1 y 2) */}
          {(step === "personal-info" || step === "security") && (
            <>
              {serverError && (
                <div className={styles.errorAlert}>{serverError}</div>
              )}

              <form
                className={styles.customForm}
                onSubmit={handleSubmit(onSubmit)}
              >
                {/* PASO 1: INFORMACIÓN PERSONAL */}
                {step === "personal-info" && (
                  <>
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
                      <label
                        htmlFor="country"
                        style={{
                          display: 'block',
                          marginBottom: '0.5rem',
                          fontSize: '0.9rem',
                          fontWeight: 500,
                          color: '#333'
                        }}
                      >
                        País de Residencia
                      </label>
                      <select
                        id="country"
                        {...register("country")}
                        style={{
                          width: "100%",
                          padding: "0.8rem",
                          borderRadius: "8px",
                          border: errors.country ? "1px solid #dc3545" : "1px solid #ddd",
                          backgroundColor: "#fff",
                          fontSize: "1rem",
                          outline: "none",
                          transition: "border-color 0.2s",
                        }}
                      >
                        <option value="">Selecciona tu país</option>
                        <option value="CO">Colombia (COP)</option>
                        <option value="MX">México (MXN)</option>
                        <option value="US">Estados Unidos (USD)</option>
                        <option value="ES">España (EUR)</option>
                        <option value="DE">Alemania (EUR)</option>
                        <option value="Gb">Reino Unido (GBP)</option>
                        <option value="OTRO">Otro (USD)</option>
                      </select>
                      {errors.country && (
                        <p style={{ color: "#dc3545", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                          {errors.country.message}
                        </p>
                      )}
                      <p style={{ fontSize: "0.75rem", color: "#666", marginTop: "0.25rem" }}>
                        Determina la moneda base de tu cuenta.
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={handleNextStep}
                      className={styles.submitBtn}
                    >
                      Continuar
                    </Button>
                  </>
                )}

                {/* PASO 2: SEGURIDAD Y LEGAL */}
                {step === "security" && (
                  <>
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

                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "rgba(0,0,0,0.5)",
                      }}
                    >
                      La contraseña debe tener 8 o más caracteres. Mínimo una
                      mayúscula, un número y un símbolo.
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
                          {...register("terms")}
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
                      {errors.terms && (
                        <p
                          style={{
                            color: "red",
                            fontSize: "0.8rem",
                            marginTop: "0.2rem",
                          }}
                        >
                          {errors.terms.message}
                        </p>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "1rem",
                        marginTop: "1.5rem",
                      }}
                    >
                      <Button
                        type="button"
                        className={styles.submitBtn}
                        style={{
                          background: "linear-gradient(90deg, #888, #aaa)",
                          flex: "0 0 30%",
                          marginTop: "0",
                          padding: "0.8rem",
                          fontSize: "0.9rem",
                        }}
                        onClick={() => setStep("personal-info")}
                      >
                        ← Atrás
                      </Button>
                      <Button
                        type="submit"
                        className={styles.submitBtn}
                        style={{
                          flex: 1,
                          marginTop: "0",
                        }}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Registrando..." : "Registrarse"}
                      </Button>
                    </div>
                  </>
                )}
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
                ¡IMPORTANTE! Guarda estos códigos
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
                    backgroundColor: isCopied ? "#28a745" : "#6c757d",
                    backgroundImage: "none",
                    fontFamily: "Candara",
                    transition: "background-color 0.3s ease",
                  }}
                >
                  {isCopied ? "¡Copiado!" : "Copiar Códigos"}
                </Button>
                <Button
                  onClick={handleFinishRecovery}
                  className={styles.submitBtn}
                  style={{ fontFamily: "Candara" }}
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
