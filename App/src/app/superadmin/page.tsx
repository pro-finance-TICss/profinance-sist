"use client";

import React from "react";
import { InvestmentChart } from "@/components/superadmin/InvestmentChart";

export default function SuperAdminPage() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(12, 1fr)",
        gap: "24px",
      }}
    >
      {/* USER Investment Chart */}
      <div style={{ gridColumn: "span 12" }}>
        <div style={{ gridColumn: "span 12 lg:span 6", display: "inline-block", width: "calc(50% - 12px)", marginRight: "24px", verticalAlign: "top" }}>
          <InvestmentChart role="USER" title="Inversión Total - Usuarios" />
        </div>
        
        {/* SOCIO Investment Chart */}
        <div style={{ gridColumn: "span 12 lg:span 6", display: "inline-block", width: "calc(50% - 12px)", verticalAlign: "top" }}>
          <InvestmentChart role="SOCIO" title="Inversión Total - Socios" />
        </div>
      </div>
    </div>
  );
}
