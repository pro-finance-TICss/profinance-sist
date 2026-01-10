"use client";
import React, { useState } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Wallet,
  History,
  ShieldCheck,
  Settings2,
  LogOut,
  Package,
  LifeBuoy,
} from "lucide-react";
import { signOut } from "next-auth/react";

interface SidebarProps {
  activeItem: string;
  setActiveItem: (item: string) => void;
}

export function Sidebar({ activeItem, setActiveItem }: SidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // ✅ Agregado 'Productos' a la lista con su icono correspondiente
  const menuItems = [
    { icon: <LayoutDashboard size={22} />, label: "Inicio" },
    { icon: <Package size={22} />, label: "Productos" }, // Nueva sección
    { icon: <BarChart3 size={22} />, label: "Inversiones" },
    { icon: <Wallet size={22} />, label: "Mi Billetera" },
    { icon: <History size={22} />, label: "Transacciones" },
    { icon: <Settings2 size={22} />, label: "Ajustes" },
    { icon: <LifeBuoy size={22} />, label: "Soporte" },
  ];

  return (
    <aside
      style={{
        width: "260px",
        height: "100vh",
        backgroundColor: "#000",
        borderRight: "1px solid rgba(189, 142, 72, 0.2)",
        padding: "40px 0",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 100,
      }}
    >
      {/* HEADER DEL SIDEBAR: LOGO CON CONTENEDOR ESTÉTICO */}
      <div style={{ marginBottom: "50px", padding: "0 20px" }}>
        <div
          style={{
            backgroundColor: "rgba(189, 142, 72, 0.03)",
            borderRadius: "16px",
            padding: "20px",
            border: "1px solid rgba(189, 142, 72, 0.15)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
            overflow: "hidden",
            boxShadow: "inset 0 0 20px rgba(189, 142, 72, 0.05)",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: "100px",
              height: "100px",
              backgroundColor: "rgba(189, 142, 72, 0.1)",
              filter: "blur(40px)",
              borderRadius: "50%",
              zIndex: 0,
            }}
          />

          <div
            style={{
              width: "100%",
              maxWidth: "180px",
              position: "relative",
              zIndex: 1,
            }}
          >
            <img
              src="/logo-unificado.png"
              alt="PRO-FINANCE"
              style={{
                width: "100%",
                height: "auto",
                objectFit: "contain",
                filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.5))",
              }}
            />
          </div>
        </div>
        <h1 style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}>
          PRO-FINANCE
        </h1>
      </div>

      <nav style={{ flex: 1 }}>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {menuItems.map((item, index) => {
            const isActive = activeItem === item.label;
            const isHovered = hoveredItem === item.label;

            return (
              <li
                key={index}
                style={{ marginBottom: "8px", padding: "0 15px" }}
              >
                <button
                  onClick={() => setActiveItem(item.label)}
                  onMouseEnter={() => setHoveredItem(item.label)}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "15px",
                    width: "100%",
                    padding: "12px 20px",
                    cursor: "pointer",
                    borderRadius: "12px",
                    textAlign: "left",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    position: "relative",
                    outline: "none",

                    border:
                      isActive || isHovered
                        ? "1px solid #bd8e48"
                        : "1px solid transparent",

                    backgroundColor: isActive
                      ? "#bd8e48"
                      : isHovered
                      ? "rgba(189, 142, 72, 0.05)"
                      : "transparent",

                    boxShadow:
                      isHovered && !isActive
                        ? "0 0 15px rgba(189, 142, 72, 0.3), inset 0 0 10px rgba(189, 142, 72, 0.1)"
                        : isActive
                        ? "0 4px 20px rgba(189, 142, 72, 0.4)"
                        : "none",

                    color: isActive
                      ? "#000"
                      : isHovered
                      ? "#fff"
                      : "rgba(255,255,255,0.4)",
                    transform:
                      !isActive && isHovered
                        ? "translateX(8px)"
                        : "translateX(0)",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      color: isActive ? "#000" : "#bd8e48",
                      filter:
                        isHovered && !isActive
                          ? "drop-shadow(0 0 5px #bd8e48)"
                          : "none",
                      transition: "all 0.3s",
                    }}
                  >
                    {item.icon}
                  </span>
                  <span
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: isActive ? "700" : "500",
                      transition: "all 0.3s",
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div style={{ padding: "0 15px" }}>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "15px",
            width: "100%",
            padding: "12px 20px",
            backgroundColor: "transparent",
            border: "none",
            color: "#ff4d4d",
            cursor: "pointer",
            borderRadius: "12px",
            transition: "all 0.3s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "rgba(255, 77, 77, 0.1)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")
          }
        >
          <LogOut size={20} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
