"use client";
import React, { useState } from "react";
import { Copy, Download, AlertTriangle, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { logger } from "@/lib/logger";

interface RecoveryCodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  codes: string[];
}

export function RecoveryCodesModal({
  isOpen,
  onClose,
  codes,
}: RecoveryCodesModalProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error("Failed to copy", err);
    }
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([codes.join("\n")], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "profinance-recovery-codes.txt";
    document.body.appendChild(element);
    element.click();

    // Auto-confirmar al descargar, asumiendo que el usuario ya tiene el archivo
    setConfirmed(true);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "#111",
          border: "1px solid rgba(189, 142, 72, 0.3)",
          borderRadius: "20px",
          padding: "30px",
          width: "90%",
          maxWidth: "500px",
          position: "relative",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.4)",
            cursor: "pointer",
          }}
        >
          <X size={24} />
        </button>

        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div
            style={{
              display: "inline-flex",
              padding: "12px",
              borderRadius: "50%",
              backgroundColor: "rgba(189, 142, 72, 0.1)",
              marginBottom: "15px",
            }}
          >
            <AlertTriangle size={32} color="#bd8e48" />
          </div>
          <h2
            style={{ color: "white", margin: "0 0 10px 0", fontSize: "1.5rem" }}
          >
            Códigos de Recuperación
          </h2>
          <p
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: "0.9rem",
              lineHeight: "1.5",
            }}
          >
            Estos códigos son la única forma de recuperar tu cuenta si pierdes
            tu dispositivo de autenticación.
            <br />
            <strong style={{ color: "#ff4d4d" }}>
              ¡Guárdalos en un lugar seguro!
            </strong>
          </p>
        </div>

        <div
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            borderRadius: "12px",
            padding: "20px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "15px",
            marginBottom: "20px",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {codes.map((code, index) => (
            <div
              key={index}
              style={{
                fontFamily: "monospace",
                fontSize: "1.1rem",
                color: "#fff",
                textAlign: "center",
                letterSpacing: "1px",
              }}
            >
              {code}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <Button
            type="button"
            onClick={handleCopy}
            style={{
              flex: 1,
              backgroundColor: copied ? "#28a745" : "rgba(255,255,255,0.1)",
              borderColor: copied ? "#28a745" : "rgba(255,255,255,0.2)",
            }}
          >
            {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
          <Button
            type="button"
            onClick={handleDownload}
            style={{ flex: 1, backgroundColor: "#bd8e48" }}
          >
            <Download size={18} /> Descargar
          </Button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "20px",
            padding: "10px",
            backgroundColor: "rgba(189, 142, 72, 0.05)",
            borderRadius: "8px",
            border: "1px solid rgba(189, 142, 72, 0.1)",
          }}
        >
          <input
            type="checkbox"
            id="confirm-saved"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            style={{
              width: "18px",
              height: "18px",
              accentColor: "#bd8e48",
              cursor: "pointer",
            }}
          />
          <label
            htmlFor="confirm-saved"
            style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            He guardado estos códigos en un lugar seguro.
          </label>
        </div>

        <Button
          onClick={onClose}
          disabled={!confirmed}
          style={{
            width: "100%",
            opacity: confirmed ? 1 : 0.5,
            cursor: confirmed ? "pointer" : "not-allowed",
          }}
        >
          Entendido, cerrar ventana
        </Button>
      </div>
    </div>
  );
}
