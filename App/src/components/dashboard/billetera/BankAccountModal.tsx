"use client";
// ============================================================================
// COMPONENTE: MODAL DE CUENTA BANCARIA - PRO-FINANCE (OPTIMIZADO)
// ============================================================================
// Formulario para agregar una nueva cuenta bancaria.
// Optimizado: sin backdropFilter blur, estilos estáticos, datos memoizados.
// ============================================================================

import React, { useState, useEffect, useMemo, memo } from "react";
import { X, CheckCircle, Loader2 } from "lucide-react";
import {
  getAvailableCountries,
  getCountryData,
} from "@/lib/data/banks";
import { logger } from "@/lib/logger";

// ============================================================================
// TIPOS
// ============================================================================

interface BankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ============================================================================
// ESTILOS ESTÁTICOS (fuera del componente para evitar recreación)
// ============================================================================

const OVERLAY_STYLE: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0, 0, 0, 0.85)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: "20px",
};

const CARD_STYLE: React.CSSProperties = {
  background: "#0a0a0a",
  border: "1px solid rgba(189, 142, 72, 0.3)",
  borderRadius: "24px",
  padding: "32px",
  maxWidth: "550px",
  width: "100%",
  maxHeight: "90vh",
  overflowY: "auto",
  position: "relative",
};

const CLOSE_BTN_STYLE: React.CSSProperties = {
  position: "absolute",
  top: "16px",
  right: "16px",
  background: "transparent",
  border: "none",
  color: "rgba(255, 255, 255, 0.5)",
  cursor: "pointer",
  padding: "8px",
};

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "rgba(255, 255, 255, 0.03)",
  border: "1px solid rgba(189, 142, 72, 0.2)",
  borderRadius: "10px",
  color: "#fff",
  fontSize: "0.95rem",
  outline: "none",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  color: "rgba(189, 142, 72, 0.8)",
  fontSize: "0.8rem",
  fontWeight: 600,
  marginBottom: "6px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

// CSS estático para opciones de dropdown (inyectado una vez)
const DROPDOWN_CSS = `
select option {
  background-color: #1a1a1a;
  color: #fff;
  padding: 10px;
}
@keyframes bankModalSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}`;

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

function BankAccountModalInner({
  isOpen,
  onClose,
  onSuccess,
}: BankAccountModalProps) {
  // Estados del formulario
  const [country, setCountry] = useState("CO");
  const [holderName, setHolderName] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  // Estados de UI
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Memoizar países disponibles (no cambian nunca)
  const countries = useMemo(() => getAvailableCountries(), []);

  // Memoizar datos del país seleccionado (solo recalcular cuando cambie el país)
  const countryData = useMemo(() => getCountryData(country), [country]);
  const banks = countryData?.banks ?? [];
  const documentTypes = countryData?.documentTypes ?? [];
  const accountTypes = countryData?.accountTypes ?? [];
  const accountNumberHint = countryData?.accountNumberHint ?? "";

  // Resetear selecciones dependientes cuando cambia el país
  useEffect(() => {
    if (countryData) {
      setDocumentType(countryData.documentTypes[0]?.code || "");
      setBankCode("");
      setAccountType(countryData.accountTypes[0]?.code || "");
    }
  }, [country, countryData]);

  // Resetear formulario cuando se abre
  useEffect(() => {
    if (isOpen) {
      setCountry("CO");
      setHolderName("");
      setDocumentNumber("");
      setBankCode("");
      setAccountNumber("");
      setIsDefault(false);
      setError("");
      setSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Manejar envío
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/wallet/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holderName,
          documentType,
          documentNumber,
          country,
          bankCode,
          accountNumber: accountNumber.replace(/\D/g, ""),
          accountType,
          isDefault,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al guardar la cuenta");
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: unknown) {
      logger.error("❌ Error guardando cuenta bancaria:", err);
      setError(
        err instanceof Error ? err.message : "Error al guardar la cuenta"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={OVERLAY_STYLE} onClick={onClose}>
      <style>{DROPDOWN_CSS}</style>
      <div style={CARD_STYLE} onClick={(e) => e.stopPropagation()}>
        {/* Botón cerrar */}
        <button onClick={onClose} style={CLOSE_BTN_STYLE}>
          <X size={24} />
        </button>

        {success ? (
          // Vista de éxito
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "rgba(76, 175, 80, 0.1)",
                border: "2px solid rgba(76, 175, 80, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
              }}
            >
              <CheckCircle size={40} color="#4caf50" />
            </div>
            <h2
              style={{
                color: "#fff",
                fontSize: "1.5rem",
                fontWeight: "700",
                margin: "0 0 12px 0",
              }}
            >
              ¡Cuenta Agregada!
            </h2>
            <p
              style={{
                color: "rgba(255, 255, 255, 0.6)",
                fontSize: "0.95rem",
              }}
            >
              Tu cuenta bancaria ha sido registrada exitosamente.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ marginBottom: "24px" }}>
              <h2
                style={{
                  color: "#fff",
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  margin: 0,
                }}
              >
                Agregar Cuenta Bancaria
              </h2>
              <p
                style={{
                  color: "rgba(255, 255, 255, 0.5)",
                  fontSize: "0.9rem",
                  margin: "8px 0 0 0",
                }}
              >
                Ingresa los datos de tu cuenta para recibir retiros
              </p>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit}>
              {/* País */}
              <div style={{ marginBottom: "16px" }}>
                <label style={LABEL_STYLE}>País</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  style={INPUT_STYLE}
                  disabled={isLoading}
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nombre del titular */}
              <div style={{ marginBottom: "16px" }}>
                <label style={LABEL_STYLE}>Nombre del titular</label>
                <input
                  type="text"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  placeholder="Como aparece en la cuenta"
                  style={INPUT_STYLE}
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Tipo y número de documento */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 2fr",
                  gap: "12px",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <label style={LABEL_STYLE}>Documento</label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    style={INPUT_STYLE}
                    disabled={isLoading}
                    required
                  >
                    {documentTypes.map((dt) => (
                      <option key={dt.code} value={dt.code}>
                        {dt.code}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={LABEL_STYLE}>Número de documento</label>
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder="Ej: 1234567890"
                    style={INPUT_STYLE}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              {/* Banco */}
              <div style={{ marginBottom: "16px" }}>
                <label style={LABEL_STYLE}>Entidad bancaria</label>
                <select
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  style={INPUT_STYLE}
                  disabled={isLoading}
                  required
                >
                  <option value="">Selecciona un banco</option>
                  {banks.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Número de cuenta */}
              <div style={{ marginBottom: "16px" }}>
                <label style={LABEL_STYLE}>Número de cuenta</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) =>
                    setAccountNumber(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder={accountNumberHint}
                  style={INPUT_STYLE}
                  disabled={isLoading}
                  required
                />
                <p
                  style={{
                    color: "rgba(255, 255, 255, 0.4)",
                    fontSize: "0.75rem",
                    margin: "6px 0 0 0",
                  }}
                >
                  {accountNumberHint}
                </p>
              </div>

              {/* Tipo de cuenta */}
              <div style={{ marginBottom: "16px" }}>
                <label style={LABEL_STYLE}>Tipo de cuenta</label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  style={INPUT_STYLE}
                  disabled={isLoading}
                  required
                >
                  {accountTypes.map((at) => (
                    <option key={at.code} value={at.code}>
                      {at.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cuenta predeterminada */}
              <div style={{ marginBottom: "24px" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    disabled={isLoading}
                    style={{
                      width: "18px",
                      height: "18px",
                      accentColor: "#bd8e48",
                    }}
                  />
                  <span
                    style={{
                      color: "rgba(255, 255, 255, 0.8)",
                      fontSize: "0.9rem",
                    }}
                  >
                    Establecer como cuenta predeterminada
                  </span>
                </label>
              </div>

              {/* Error */}
              {error && (
                <div
                  style={{
                    padding: "12px 16px",
                    background: "rgba(255, 77, 77, 0.1)",
                    border: "1px solid rgba(255, 77, 77, 0.3)",
                    borderRadius: "12px",
                    color: "#ff4d4d",
                    fontSize: "0.85rem",
                    marginBottom: "20px",
                  }}
                >
                  {error}
                </div>
              )}

              {/* Botones */}
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: "14px",
                    background: "transparent",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "12px",
                    color: "rgba(255, 255, 255, 0.7)",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    cursor: isLoading ? "not-allowed" : "pointer",
                    transition: "all 0.3s",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: "14px",
                    background: isLoading
                      ? "rgba(189, 142, 72, 0.3)"
                      : "#bd8e48",
                    border: "none",
                    borderRadius: "12px",
                    color: "#000",
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    cursor: isLoading ? "not-allowed" : "pointer",
                    transition: "all 0.3s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2
                        size={18}
                        style={{ animation: "bankModalSpin 1s linear infinite" }}
                      />
                      Guardando...
                    </>
                  ) : (
                    "Guardar Cuenta"
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// Memo previene re-renders innecesarios del componente padre
export const BankAccountModal = memo(BankAccountModalInner);
BankAccountModal.displayName = "BankAccountModal";

