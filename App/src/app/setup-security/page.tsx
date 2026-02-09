"use client";
// ============================================================================
// PÁGINA DE CONFIGURACIÓN DE SEGURIDAD OBLIGATORIA - PRO-FINANCE
// ============================================================================
// Flujo de onboarding para usuarios ADMIN/SUPERADMIN que deben:
// 1. Configurar 2FA (obligatorio)
// 2. Cambiar contraseña inicial (obligatorio)
// ============================================================================

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Shield,
  Key,
  CheckCircle,
  Lock,
  ArrowRight,
  LogOut,
} from "lucide-react";
import {
  checkSecuritySetupStatus,
  changePassword,
} from "@/lib/actions/security-setup";
import { TotpSetupComponent } from "@/components/security/TotpSetupComponent";

// ============================================================================
// TIPOS
// ============================================================================

interface SetupStatus {
  requiresSetup: boolean;
  needsTotpSetup?: boolean;
  needsPasswordChange?: boolean;
  currentStep?: number;
  totalSteps?: number;
  reason?: string;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function SetupSecurityPage() {
  const router = useRouter();
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<"totp" | "password" | "done">(
    "totp"
  );

  // Estados para cambio de contraseña
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Verificar estado al cargar
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const result = await checkSecuritySetupStatus();
        setStatus(result);

        if (!result.requiresSetup) {
          // El usuario no necesita configuración.
          // Esto puede suceder si ya completó el setup pero el token JWT
          // todavía tiene requiresSecuritySetup: true.
          // Hacemos signOut para forzar un nuevo login con token actualizado.
          await signOut({ callbackUrl: "/login?setupComplete=true" });
          return;
        }

        // Determinar paso inicial
        if (result.needsTotpSetup) {
          setCurrentStep("totp");
        } else if (result.needsPasswordChange) {
          setCurrentStep("password");
        } else {
          setCurrentStep("done");
        }
      } catch (error) {
        console.error("Error verificando estado:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, [router]);

  // Manejar completado del paso TOTP
  const handleTotpComplete = async () => {
    // Recargar estado para verificar si se completó TOTP
    const result = await checkSecuritySetupStatus();
    setStatus(result);

    if (result.needsPasswordChange) {
      setCurrentStep("password");
    } else {
      // Si no necesita cambiar contraseña, completamos el setup
      setCurrentStep("done");
      // Forzar logout para que el próximo login genere un token actualizado
      setTimeout(async () => {
        await signOut({ callbackUrl: "/login?setupComplete=true" });
      }, 2500);
    }
  };

  // Manejar cambio de contraseña
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden");
      return;
    }

    setIsChangingPassword(true);
    try {
      const result = await changePassword(currentPassword, newPassword);

      if (!result.success) {
        setPasswordError(result.message);
        return;
      }

      setPasswordSuccess(true);
      setCurrentStep("done");
      // Forzar logout para que el próximo login genere un token actualizado
      setTimeout(async () => {
        await signOut({ callbackUrl: "/login?setupComplete=true" });
      }, 2500);
    } catch (error) {
      setPasswordError("Error al cambiar la contraseña");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Pantalla de carga
  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingCard}>
          <div style={styles.spinner} />
          <p style={{ color: "rgba(255,255,255,0.6)", marginTop: "16px" }}>
            Verificando configuración de seguridad...
          </p>
        </div>
      </div>
    );
  }

  // Si no hay status o no requiere setup, mostrar cargando (se redirige)
  if (!status || !status.requiresSetup) {
    return null;
  }

  return (
    <div style={styles.container}>
      {/* Fondo con logo */}
      <div style={styles.background} />

      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.iconContainer}>
            <Shield size={40} color="#bd8e48" />
          </div>
          <h1 style={styles.title}>Configuración de Seguridad</h1>
          <p style={styles.subtitle}>
            Tu cuenta requiere configuración inicial de seguridad antes de
            continuar.
          </p>
        </div>

        {/* Indicador de progreso */}
        <div style={styles.progressContainer}>
          <div
            style={{
              ...styles.progressStep,
              ...(currentStep === "totp" ? styles.progressStepActive : {}),
              ...(currentStep !== "totp" ? styles.progressStepComplete : {}),
            }}
          >
            <div style={styles.progressNumber}>
              {currentStep === "totp" ? (
                "1"
              ) : (
                <CheckCircle size={16} color="#fff" />
              )}
            </div>
            <span style={styles.progressLabel}>Configurar 2FA</span>
          </div>
          <div style={styles.progressLine} />
          <div
            style={{
              ...styles.progressStep,
              ...(currentStep === "password" ? styles.progressStepActive : {}),
              ...(currentStep === "done" ? styles.progressStepComplete : {}),
            }}
          >
            <div style={styles.progressNumber}>
              {currentStep === "done" && status.needsPasswordChange !== false
                ? "✓"
                : "2"}
            </div>
            <span style={styles.progressLabel}>Cambiar Contraseña</span>
          </div>
        </div>

        {/* Contenido del paso actual */}
        <div style={styles.stepContent}>
          {currentStep === "totp" && (
            <div>
              <div style={styles.stepHeader}>
                <Lock size={24} color="#bd8e48" />
                <h2 style={styles.stepTitle}>
                  Paso 1: Autenticación de Dos Factores
                </h2>
              </div>
              <p style={styles.stepDescription}>
                Por seguridad, las cuentas deben tener 2FA habilitado. Configura
                tu aplicación autenticadora para continuar.
              </p>

              {/* Componente de configuración de TOTP */}
              <div style={{ marginTop: "24px" }}>
                <TotpSetupComponent onComplete={handleTotpComplete} />
              </div>
            </div>
          )}

          {currentStep === "password" && (
            <div>
              <div style={styles.stepHeader}>
                <Key size={24} color="#bd8e48" />
                <h2 style={styles.stepTitle}>Paso 2: Cambiar Contraseña</h2>
              </div>
              <p style={styles.stepDescription}>
                Por seguridad, debes cambiar la contraseña inicial por una nueva
                contraseña segura que solo tú conozcas.
              </p>

              <form onSubmit={handlePasswordChange} style={styles.form}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Contraseña Actual</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Ingresa tu contraseña actual"
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Nueva Contraseña</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    style={styles.input}
                    required
                    minLength={8}
                  />
                  <p style={styles.hint}>
                    Debe contener mayúsculas, minúsculas, números y caracteres
                    especiales.
                  </p>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Confirmar Nueva Contraseña</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                    style={styles.input}
                    required
                  />
                </div>

                {passwordError && (
                  <div style={styles.errorBox}>{passwordError}</div>
                )}

                <button
                  type="submit"
                  disabled={isChangingPassword}
                  style={{
                    ...styles.submitButton,
                    opacity: isChangingPassword ? 0.6 : 1,
                    cursor: isChangingPassword ? "not-allowed" : "pointer",
                  }}
                >
                  {isChangingPassword ? (
                    "Actualizando..."
                  ) : (
                    <>
                      Cambiar Contraseña <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {currentStep === "done" && (
            <div style={styles.successContainer}>
              <div style={styles.successIcon}>
                <CheckCircle size={48} color="#4caf50" />
              </div>
              <h2 style={styles.successTitle}>¡Configuración Completada!</h2>
              <p style={styles.successMessage}>
                Tu cuenta ahora está protegida con autenticación de dos factores
                y una contraseña segura.
              </p>
              <p style={styles.redirectMessage}>
                <LogOut
                  size={14}
                  style={{ marginRight: "6px", display: "inline" }}
                />
                Serás redirigido al login para aplicar los cambios...
              </p>
            </div>
          )}
        </div>

        {/* Aviso de seguridad */}
        <div style={styles.securityNotice}>
          <Shield size={16} color="rgba(189, 142, 72, 0.8)" />
          <span>
            Esta configuración de seguridad es obligatoria para proteger tu cuenta.
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
    padding: "20px",
    position: "relative",
    overflow: "hidden",
  },
  background: {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "100vh",
    height: "100vh",
    backgroundImage: 'url("/Background-recortado.png")',
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "contain",
    opacity: 0.04,
    pointerEvents: "none",
    zIndex: 0,
  },
  card: {
    background: "rgba(10, 10, 10, 0.95)",
    border: "1px solid rgba(189, 142, 72, 0.3)",
    borderRadius: "24px",
    padding: "40px",
    maxWidth: "600px",
    width: "100%",
    position: "relative",
    zIndex: 1,
  },
  header: {
    textAlign: "center",
    marginBottom: "32px",
  },
  iconContainer: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    background: "rgba(189, 142, 72, 0.1)",
    border: "1px solid rgba(189, 142, 72, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
  },
  title: {
    color: "#fff",
    fontSize: "1.8rem",
    fontWeight: "700",
    margin: "0 0 12px 0",
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: "0.95rem",
    margin: 0,
    lineHeight: "1.6",
  },
  progressContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    marginBottom: "32px",
  },
  progressStep: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    opacity: 0.5,
  },
  progressStepActive: {
    opacity: 1,
  },
  progressStepComplete: {
    opacity: 0.8,
  },
  progressNumber: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: "rgba(189, 142, 72, 0.2)",
    border: "1px solid rgba(189, 142, 72, 0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#bd8e48",
    fontSize: "0.85rem",
    fontWeight: "600",
  },
  progressLabel: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: "0.85rem",
  },
  progressLine: {
    width: "40px",
    height: "2px",
    background: "rgba(189, 142, 72, 0.3)",
  },
  stepContent: {
    marginBottom: "24px",
  },
  stepHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
  },
  stepTitle: {
    color: "#fff",
    fontSize: "1.2rem",
    fontWeight: "600",
    margin: 0,
  },
  stepDescription: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: "0.9rem",
    lineHeight: "1.6",
    margin: 0,
  },
  form: {
    marginTop: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    color: "rgba(189, 142, 72, 0.8)",
    fontSize: "0.85rem",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  input: {
    padding: "14px 16px",
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(189, 142, 72, 0.2)",
    borderRadius: "12px",
    color: "#fff",
    fontSize: "1rem",
    outline: "none",
    transition: "border-color 0.3s",
  },
  hint: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: "0.75rem",
    margin: 0,
  },
  errorBox: {
    padding: "12px 16px",
    background: "rgba(255, 77, 77, 0.1)",
    border: "1px solid rgba(255, 77, 77, 0.3)",
    borderRadius: "12px",
    color: "#ff4d4d",
    fontSize: "0.9rem",
  },
  submitButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "16px",
    background: "#bd8e48",
    border: "none",
    borderRadius: "12px",
    color: "#000",
    fontSize: "1rem",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.3s",
    marginTop: "8px",
  },
  successContainer: {
    textAlign: "center",
    padding: "20px 0",
  },
  successIcon: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    background: "rgba(76, 175, 80, 0.1)",
    border: "1px solid rgba(76, 175, 80, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
  },
  successTitle: {
    color: "#fff",
    fontSize: "1.5rem",
    fontWeight: "700",
    margin: "0 0 12px 0",
  },
  successMessage: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: "0.95rem",
    margin: "0 0 16px 0",
    lineHeight: "1.6",
  },
  redirectMessage: {
    color: "rgba(189, 142, 72, 0.8)",
    fontSize: "0.85rem",
    margin: 0,
  },
  securityNotice: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px",
    background: "rgba(189, 142, 72, 0.05)",
    border: "1px solid rgba(189, 142, 72, 0.15)",
    borderRadius: "12px",
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: "0.8rem",
  },
  loadingCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px",
    background: "rgba(10, 10, 10, 0.95)",
    border: "1px solid rgba(189, 142, 72, 0.3)",
    borderRadius: "24px",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid rgba(189, 142, 72, 0.2)",
    borderTop: "3px solid #bd8e48",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
};
