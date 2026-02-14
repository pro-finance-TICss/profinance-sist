// ============================================================================
// COMPONENTE DE CONFIGURACIÓN TOTP - PRO-FINANCE
// ============================================================================
// Muestra el código QR y permite verificar el código TOTP durante el registro.
// Compatible con Google Authenticator, Authy, Microsoft Authenticator, etc.
// ============================================================================

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { logger } from "@/lib/logger";

// ============================================================================
// TIPOS
// ============================================================================

interface TotpSetupProps {
  /** Data URL del código QR (base64 PNG) */
  qrCode: string;
  /** Secreto TOTP en base32 para entrada manual */
  secret: string;
  /** Callback cuando el usuario verifica el código */
  onVerify: (code: string) => Promise<{ success: boolean; message: string }>;
  /** Título del componente */
  title?: string;
  /** Callback cuando la verificación es exitosa */
  onSuccess?: () => void;
}

// ============================================================================
// ESTILOS EN LÍNEA (para mantener consistencia con el diseño existente)
// ============================================================================

const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "1.5rem",
    padding: "2rem",
    maxWidth: "450px",
    margin: "0 auto",
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#1a1a1a",
    textAlign: "center" as const,
    marginBottom: "0.5rem",
  },
  instructions: {
    backgroundColor: "rgba(189, 142, 72, 0.1)",
    border: "1px solid rgba(189, 142, 72, 0.3)",
    borderRadius: "12px",
    padding: "1rem",
    fontSize: "0.9rem",
    color: "rgba(0, 0, 0, 0.7)",
    lineHeight: 1.6,
  },
  step: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.5rem",
    marginBottom: "0.5rem",
  },
  stepNumber: {
    backgroundColor: "#bd8e48",
    color: "white",
    borderRadius: "50%",
    width: "22px",
    height: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.75rem",
    fontWeight: 700,
    flexShrink: 0,
  },
  qrWrapper: {
    backgroundColor: "white",
    padding: "1rem",
    borderRadius: "16px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
    border: "1px solid rgba(189, 142, 72, 0.2)",
  },
  qrImage: {
    display: "block",
    width: "200px",
    height: "200px",
  },
  toggleButton: {
    background: "none",
    border: "none",
    color: "#bd8e48",
    cursor: "pointer",
    fontSize: "0.9rem",
    textDecoration: "underline",
    padding: "0.5rem",
  },
  secretContainer: {
    backgroundColor: "#f5f5f5",
    borderRadius: "8px",
    padding: "1rem",
    width: "100%",
    textAlign: "center" as const,
  },
  secretCode: {
    fontFamily: "monospace",
    fontSize: "1rem",
    letterSpacing: "2px",
    color: "#333",
    wordBreak: "break-all" as const,
    marginBottom: "0.5rem",
  },
  copyButton: {
    backgroundColor: "#bd8e48",
    color: "white",
    border: "none",
    borderRadius: "6px",
    padding: "0.5rem 1rem",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  codeGroup: {
    width: "100%",
  },
  label: {
    display: "block",
    color: "#333",
    fontSize: "0.9rem",
    fontWeight: 600,
    marginBottom: "0.5rem",
  },
  input: {
    width: "100%",
    padding: "0.8rem",
    fontSize: "1.2rem",
    textAlign: "center" as const,
    letterSpacing: "5px",
    border: "2px solid #ddd",
    borderRadius: "8px",
    outline: "none",
    color: "#333",
    backgroundColor: "#fff",
    transition: "border-color 0.2s",
  },
  errorMessage: {
    backgroundColor: "rgba(220, 53, 69, 0.1)",
    border: "1px solid #dc3545",
    color: "#dc3545",
    padding: "0.75rem",
    borderRadius: "8px",
    fontSize: "0.9rem",
    textAlign: "center" as const,
    width: "100%",
  },
  successMessage: {
    backgroundColor: "rgba(40, 167, 69, 0.1)",
    border: "1px solid #28a745",
    color: "#28a745",
    padding: "0.75rem",
    borderRadius: "8px",
    fontSize: "0.9rem",
    textAlign: "center" as const,
    width: "100%",
  },
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function TotpSetup({
  qrCode,
  secret,
  onVerify,
  onSuccess,
  title = "Configura tu Autenticador",
}: TotpSetupProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  // ================================================================
  // HANDLERS
  // ================================================================

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Solo permitir dígitos
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(value);
    setError(null);
  };

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback para navegadores sin soporte de clipboard
      logger.error("No se pudo copiar al portapapeles");
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError("El código debe tener 6 dígitos");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const result = await onVerify(code);

      if (result.success) {
        setSuccess(result.message);
        onSuccess?.();
      } else {
        setError(result.message);
        setCode(""); // Limpiar código incorrecto
      }
    } catch (e) {
      setError("Error al verificar el código. Intenta de nuevo.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && code.length === 6) {
      handleVerify();
    }
  };

  // ================================================================
  // RENDER
  // ================================================================

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>{title}</h2>

      {/* INSTRUCCIONES */}
      <div style={styles.instructions}>
        <div style={styles.step}>
          <span style={styles.stepNumber}>1</span>
          <span>
            Descarga una app de autenticación (Google Authenticator, Authy,
            Microsoft Authenticator)
          </span>
        </div>
        <div style={styles.step}>
          <span style={styles.stepNumber}>2</span>
          <span>Escanea el código QR o ingresa el código manualmente</span>
        </div>
        <div style={styles.step}>
          <span style={styles.stepNumber}>3</span>
          <span>Ingresa el código de 6 dígitos generado por la app</span>
        </div>
      </div>

      {/* CÓDIGO QR */}
      <div style={styles.qrWrapper}>
        <img
          src={qrCode}
          alt="Código QR para autenticador"
          style={styles.qrImage}
        />
      </div>

      {/* TOGGLE PARA CÓDIGO MANUAL */}
      <button
        type="button"
        onClick={() => setShowSecret(!showSecret)}
        style={styles.toggleButton}
      >
        {showSecret
          ? "Ocultar código manual"
          : "¿No puedes escanear? Ver código manual"}
      </button>

      {/* CÓDIGO SECRETO MANUAL */}
      {showSecret && (
        <div style={styles.secretContainer}>
          <div style={styles.secretCode}>{secret}</div>
          <button
            type="button"
            onClick={handleCopySecret}
            style={{
              ...styles.copyButton,
              backgroundColor: copied ? "#28a745" : "#bd8e48",
              transform: copied ? "scale(1.05)" : "scale(1)",
              transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)", // Efecto rebote sutil
            }}
          >
            {copied ? "✓ Copiado" : "Copiar código"}
          </button>
        </div>
      )}

      {/* MENSAJES DE ERROR/ÉXITO */}
      {error && <div style={styles.errorMessage}>{error}</div>}
      {success && <div style={styles.successMessage}>{success}</div>}

      {/* INPUT DE CÓDIGO */}
      {!success && (
        <>
          <div style={styles.codeGroup}>
            <label htmlFor="totp-input" style={styles.label}>
              Código de verificación
            </label>
            <input
              id="totp-input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={handleCodeChange}
              onKeyDown={handleKeyDown}
              placeholder="000000"
              autoComplete="one-time-code"
              style={styles.input}
              onFocus={(e) => (e.target.style.borderColor = "#bd8e48")}
              onBlur={(e) => (e.target.style.borderColor = "#ddd")}
            />
          </div>

          <Button
            type="button"
            onClick={handleVerify}
            disabled={isVerifying || code.length !== 6}
            style={{ width: "100%" }}
          >
            {isVerifying ? "Verificando..." : "Verificar y Continuar"}
          </Button>
        </>
      )}
    </div>
  );
}
