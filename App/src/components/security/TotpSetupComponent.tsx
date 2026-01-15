"use client";
// ============================================================================
// COMPONENTE DE CONFIGURACIÓN DE TOTP - PRO-FINANCE
// ============================================================================
// Permite a usuarios configurar su autenticación de dos factores (2FA).
// Usado en el flujo de onboarding para ADMIN/SUPERADMIN.
// ============================================================================

import React, { useState, useEffect } from "react";
import { Smartphone, CheckCircle, Copy, AlertTriangle } from "lucide-react";
import {
  getTotpSetupForCurrentUser,
  confirmTotpSetup,
} from "@/lib/actions/auth";

interface TotpSetupComponentProps {
  onComplete?: () => void;
}

interface TotpSetupData {
  qrCode: string;
  secret: string;
  userId: string;
}

export function TotpSetupComponent({ onComplete }: TotpSetupComponentProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [setupData, setSetupData] = useState<TotpSetupData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Estado del formulario de verificación
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Estado de recovery codes
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  // Cargar datos de setup al montar
  useEffect(() => {
    const loadSetup = async () => {
      try {
        const result = await getTotpSetupForCurrentUser();
        if (result.success && result.totpSetup) {
          setSetupData(result.totpSetup);
        } else {
          setError(result.message);
        }
      } catch (err) {
        setError("Error al cargar configuración de seguridad");
      } finally {
        setIsLoading(false);
      }
    };

    loadSetup();
  }, []);

  // Manejar verificación del código
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupData) return;

    setIsVerifying(true);
    setVerifyError(null);

    try {
      const result = await confirmTotpSetup(setupData.userId, verificationCode);

      if (result.success) {
        // Mostrar códigos de recuperación
        if (result.recoveryCodes) {
          setRecoveryCodes(result.recoveryCodes);
        } else {
          // Si no hay códigos, completar directamente
          onComplete?.();
        }
      } else {
        setVerifyError(result.message);
      }
    } catch (err) {
      setVerifyError("Error al verificar el código");
    } finally {
      setIsVerifying(false);
    }
  };

  // Copiar códigos de recuperación
  const handleCopyCodes = () => {
    if (recoveryCodes) {
      navigator.clipboard.writeText(recoveryCodes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Continuar después de ver códigos de recuperación
  const handleContinue = () => {
    onComplete?.();
  };

  // Estado de carga
  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Cargando configuración...</p>
      </div>
    );
  }

  // Error al cargar
  if (error && !setupData) {
    return (
      <div style={styles.errorContainer}>
        <AlertTriangle size={24} color="#ff4d4d" />
        <p style={styles.errorText}>{error}</p>
      </div>
    );
  }

  // Mostrar códigos de recuperación
  if (recoveryCodes) {
    return (
      <div style={styles.recoveryContainer}>
        <div style={styles.recoveryHeader}>
          <CheckCircle size={32} color="#4caf50" />
          <h3 style={styles.recoveryTitle}>¡2FA Configurado Correctamente!</h3>
        </div>

        <div style={styles.warningBox}>
          <AlertTriangle size={20} color="#bd8e48" />
          <p style={styles.warningText}>
            <strong>Importante:</strong> Guarda estos códigos de recuperación en
            un lugar seguro. Los necesitarás si pierdes acceso a tu
            autenticador.
          </p>
        </div>

        <div style={styles.codesGrid}>
          {recoveryCodes.map((code, index) => (
            <div key={index} style={styles.codeItem}>
              {code}
            </div>
          ))}
        </div>

        <button onClick={handleCopyCodes} style={styles.copyButton}>
          <Copy size={16} />
          {copied ? "¡Copiados!" : "Copiar Códigos"}
        </button>

        <button onClick={handleContinue} style={styles.continueButton}>
          Continuar
        </button>
      </div>
    );
  }

  // Formulario de configuración
  return (
    <div style={styles.container}>
      {/* Instrucciones */}
      <div style={styles.instructions}>
        <div style={styles.stepIcon}>
          <Smartphone size={24} color="#bd8e48" />
        </div>
        <div>
          <h4 style={styles.instructionTitle}>Escanea el código QR</h4>
          <p style={styles.instructionText}>
            Usa una aplicación autenticadora como Google Authenticator, Authy o
            Microsoft Authenticator.
          </p>
        </div>
      </div>

      {/* Código QR */}
      {setupData && (
        <div style={styles.qrContainer}>
          <img
            src={setupData.qrCode}
            alt="Código QR para configurar 2FA"
            style={styles.qrImage}
          />
        </div>
      )}

      {/* Código secreto manual */}
      {setupData && (
        <div style={styles.secretContainer}>
          <p style={styles.secretLabel}>
            ¿No puedes escanear? Ingresa este código manualmente:
          </p>
          <div style={styles.secretBox}>
            <code style={styles.secretCode}>{setupData.secret}</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(setupData.secret);
              }}
              style={styles.copyIcon}
              title="Copiar código"
            >
              <Copy size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Formulario de verificación */}
      <form onSubmit={handleVerify} style={styles.verifyForm}>
        <label style={styles.verifyLabel}>
          Ingresa el código de 6 dígitos de tu autenticador:
        </label>
        <input
          type="text"
          value={verificationCode}
          onChange={(e) =>
            setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          placeholder="000000"
          maxLength={6}
          style={styles.verifyInput}
          required
        />

        {verifyError && <p style={styles.verifyError}>{verifyError}</p>}

        <button
          type="submit"
          disabled={isVerifying || verificationCode.length !== 6}
          style={{
            ...styles.verifyButton,
            opacity: isVerifying || verificationCode.length !== 6 ? 0.6 : 1,
            cursor:
              isVerifying || verificationCode.length !== 6
                ? "not-allowed"
                : "pointer",
          }}
        >
          {isVerifying ? "Verificando..." : "Verificar y Activar 2FA"}
        </button>
      </form>
    </div>
  );
}

// ============================================================================
// ESTILOS
// ============================================================================

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  loadingText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: "0.9rem",
    textAlign: "center",
  },
  spinner: {
    width: "32px",
    height: "32px",
    border: "3px solid rgba(189, 142, 72, 0.2)",
    borderTop: "3px solid #bd8e48",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto",
  },
  errorContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    padding: "24px",
    background: "rgba(255, 77, 77, 0.05)",
    border: "1px solid rgba(255, 77, 77, 0.2)",
    borderRadius: "12px",
  },
  errorText: {
    color: "#ff4d4d",
    fontSize: "0.9rem",
    margin: 0,
    textAlign: "center",
  },
  instructions: {
    display: "flex",
    gap: "16px",
    padding: "16px",
    background: "rgba(189, 142, 72, 0.05)",
    border: "1px solid rgba(189, 142, 72, 0.15)",
    borderRadius: "12px",
  },
  stepIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    background: "rgba(189, 142, 72, 0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  instructionTitle: {
    color: "#fff",
    fontSize: "1rem",
    fontWeight: "600",
    margin: "0 0 6px 0",
  },
  instructionText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: "0.85rem",
    margin: 0,
    lineHeight: "1.5",
  },
  qrContainer: {
    display: "flex",
    justifyContent: "center",
    padding: "24px",
    background: "#fff",
    borderRadius: "16px",
  },
  qrImage: {
    width: "200px",
    height: "200px",
  },
  secretContainer: {
    textAlign: "center",
  },
  secretLabel: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: "0.8rem",
    margin: "0 0 8px 0",
  },
  secretBox: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 16px",
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "8px",
  },
  secretCode: {
    color: "#bd8e48",
    fontSize: "0.9rem",
    fontFamily: "monospace",
    letterSpacing: "1px",
  },
  copyIcon: {
    background: "transparent",
    border: "none",
    color: "rgba(255, 255, 255, 0.5)",
    cursor: "pointer",
    padding: "4px",
    display: "flex",
  },
  verifyForm: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  verifyLabel: {
    color: "rgba(189, 142, 72, 0.8)",
    fontSize: "0.85rem",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  verifyInput: {
    padding: "16px",
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(189, 142, 72, 0.2)",
    borderRadius: "12px",
    color: "#fff",
    fontSize: "1.5rem",
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: "8px",
    outline: "none",
  },
  verifyError: {
    color: "#ff4d4d",
    fontSize: "0.85rem",
    margin: 0,
    textAlign: "center",
  },
  verifyButton: {
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
  // Recovery codes styles
  recoveryContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  recoveryHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    textAlign: "center",
  },
  recoveryTitle: {
    color: "#fff",
    fontSize: "1.2rem",
    fontWeight: "600",
    margin: 0,
  },
  warningBox: {
    display: "flex",
    gap: "12px",
    padding: "16px",
    background: "rgba(189, 142, 72, 0.1)",
    border: "1px solid rgba(189, 142, 72, 0.3)",
    borderRadius: "12px",
  },
  warningText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: "0.9rem",
    margin: 0,
    lineHeight: "1.5",
  },
  codesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "8px",
    padding: "16px",
    background: "rgba(255, 255, 255, 0.95)",
    borderRadius: "12px",
  },
  codeItem: {
    padding: "8px 12px",
    background: "#f0f0f0",
    borderRadius: "6px",
    fontFamily: "monospace",
    fontSize: "0.9rem",
    color: "#333",
    textAlign: "center",
  },
  copyButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "12px",
    background: "rgba(255, 255, 255, 0.1)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  continueButton: {
    padding: "16px",
    background: "#bd8e48",
    border: "none",
    borderRadius: "12px",
    color: "#000",
    fontSize: "1rem",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.3s",
  },
};
