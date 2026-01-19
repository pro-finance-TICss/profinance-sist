"use client";
import React from "react";
import { Search, Bell, ShieldCheck } from "lucide-react";
import Link from "next/link";
// Reusamos el componente de notificaciones o creamos uno simple si no es necesario
// Para mantener consistencia visual, lo dejaremos estático o lo importaremos si funciona igual.
// Por simplicidad, copiaré la campana visual, pero sin lógica compleja por ahora para evitar errores de imports no verificados.
// Si NotificationBell es exportado, lo podría usar. Revisaré DashboardHeader para ver si es exportado.
// En DashboardHeader era interno. Lo copiaré simplificado.

export const AdminHeader = ({
  title,
  role = "ADMIN",
}: {
  title: string;
  role?: string;
}) => {
  return (
    <header
      style={{
        height: "80px",
        padding: "0 30px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(189, 142, 72, 0.2)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        width: "100%",
      }}
    >
      {/* 1. TÍTULO */}
      <div style={{ minWidth: "200px" }}>
        <h2
          style={{
            margin: 0,
            fontSize: "1.4rem",
            color: "#fff",
            fontWeight: "600",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
          }}
        >
          {title}
        </h2>
        <span
          style={{
            fontSize: "0.75rem",
            color: "#bd8e48",
            opacity: 0.8,
            fontWeight: "500",
          }}
        >
          PANEL DE ADMINISTRACIÓN
        </span>
      </div>

      {/* 2. BUSCADOR (Visual) */}
      <div style={{ flex: 0.4, position: "relative" }}>
        <Search
          size={16}
          color="#bd8e48"
          style={{
            position: "absolute",
            left: "15px",
            top: "50%",
            transform: "translateY(-50%)",
            opacity: 0.6,
          }}
        />
        <input
          type="text"
          placeholder="Buscar usuarios, tickets, registros..."
          style={{
            width: "100%",
            backgroundColor: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(189, 142, 72, 0.15)",
            borderRadius: "12px",
            padding: "12px 15px 12px 45px",
            color: "#fff",
            fontSize: "0.85rem",
            outline: "none",
            transition: "all 0.3s ease",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#bd8e48")}
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = "rgba(189, 142, 72, 0.15)")
          }
        />
      </div>

      {/* 3. PERFIL */}
      <div style={{ display: "flex", alignItems: "center", gap: "25px" }}>
        {/* Campana simple */}
        <div style={{ position: "relative", cursor: "pointer" }}>
          <Bell size={20} color="#bd8e48" />
          <span
            style={{
              position: "absolute",
              top: "0",
              right: "0",
              width: "8px",
              height: "8px",
              backgroundColor: "#bd8e48",
              borderRadius: "50%",
            }}
          ></span>
        </div>

        {/* Perfil */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "15px",
            paddingLeft: "20px",
            borderLeft: "1px solid rgba(189, 142, 72, 0.2)",
          }}
        >
          <div style={{ textAlign: "right" }}>
            <p
              style={{
                margin: 0,
                fontSize: "0.85rem",
                fontWeight: "700",
                color: "#fff",
                letterSpacing: "0.3px",
              }}
            >
              {role === "SUPER_ADMIN" ? "Super Admin" : "Administrador"}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "0.65rem",
                color: "#bd8e48",
                fontWeight: "bold",
                textTransform: "uppercase",
              }}
            >
              System Access
            </p>
          </div>

          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #bd8e48, #8a662d)",
              border: "2px solid rgba(189, 142, 72, 0.4)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
            }}
          >
            <ShieldCheck size={22} color="#000" />
          </div>
        </div>
      </div>
    </header>
  );
};
