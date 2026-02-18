"use client";

import { PageHeader } from "@/components/PageHeader";

export default function InversionesPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <PageHeader
        title="Inversiones"
        subtitle="Portafolio de Inversiones (En desarrollo)."
      />
      <div
        style={{
        padding: "40px",
        textAlign: "center",
        color: "rgba(255,255,255,0.2)",
        border: "1px dashed rgba(255,255,255,0.1)",
        borderRadius: "24px",
      }}
    >
      <p>Sección de Inversiones en desarrollo...</p>
      </div>
    </div>
  );
}
