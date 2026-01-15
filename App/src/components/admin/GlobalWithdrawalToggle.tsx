"use client";

import React, { useState, useTransition } from "react";
import { updateGlobalWithdrawalSettings } from "@/lib/actions/admin";
import { AlertTriangle, Power } from "lucide-react";

interface GlobalWithdrawalToggleProps {
  initialEnabled: boolean;
}

export function GlobalWithdrawalToggle({
  initialEnabled,
}: GlobalWithdrawalToggleProps) {
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  const handleToggle = async () => {
    const newState = !isEnabled;
    setIsEnabled(newState); // Optimistic update

    startTransition(async () => {
      const res = await updateGlobalWithdrawalSettings(newState);
      if (!res.success) {
        setIsEnabled(!newState); // Revert on failure
        alert("Error al actualizar la configuración: " + res.message);
      }
    });
  };

  return (
    <div
      style={{
        marginBottom: "24px",
        padding: "20px",
        backgroundColor: "#111",
        borderRadius: "12px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "20px",
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: 1 }}>
        <h3
          style={{
            color: "#fff",
            margin: "0 0 8px 0",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <Power size={20} color={isEnabled ? "#34d399" : "#f87171"} />
          Control Global de Retiros
        </h3>
        <p style={{ color: "#888", margin: 0, fontSize: "0.9rem" }}>
          {isEnabled
            ? "Los retiros están habilitados (sujetos a la fecha límite mensual)."
            : "Los retiros están completamente deshabilitados para todos los usuarios."}
        </p>
      </div>

      <button
        onClick={handleToggle}
        disabled={isPending}
        style={{
          padding: "10px 20px",
          borderRadius: "8px",
          fontWeight: "600",
          cursor: isPending ? "wait" : "pointer",
          background: isEnabled
            ? "rgba(239, 68, 68, 0.2)"
            : "rgba(16, 185, 129, 0.2)",
          color: isEnabled ? "#f87171" : "#34d399",
          border: `1px solid ${isEnabled ? "#ef4444" : "#10b981"}`,
          transition: "all 0.2s",
        }}
      >
        {isEnabled ? "Deshabilitar Retiros" : "Habilitar Retiros"}
      </button>
    </div>
  );
}
