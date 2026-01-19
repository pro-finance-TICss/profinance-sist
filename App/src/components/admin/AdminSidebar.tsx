"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  MessageSquare,
  ShieldAlert,
  LogOut,
  LayoutDashboard,
  Wallet,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export function AdminSidebar() {
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const { data: session } = useSession();

  // Helper para verificar ruta activa
  const isActive = (path: string) => pathname.startsWith(path);

  const adminItems = [
    {
      icon: <Users size={22} />,
      label: "Usuarios",
      path: "/admin/users",
    },
    {
      icon: <MessageSquare size={22} />,
      label: "Tickets Soporte",
      path: "/admin/tickets",
    },
  ];

  const superAdminItems = [
    {
      icon: <ShieldAlert size={22} />,
      label: "Gestionar Retiros",
      path: "/superadmin/withdrawals",
    },
    // Se pueden agregar más items de superadmin aquí
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
        position: "sticky", // Sticky en layout admin flex
        top: 0,
        zIndex: 100,
        flexShrink: 0,
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
      </div>

      <nav style={{ flex: 1, padding: "0 15px" }}>
        {/* SECCIÓN ADMIN */}
        <div
          style={{
            fontSize: "0.75rem",
            textTransform: "uppercase",
            color: "rgba(189, 142, 72, 0.8)",
            marginBottom: "15px",
            paddingLeft: "10px",
            fontWeight: 700,
            letterSpacing: "1px",
          }}
        >
          Administración
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 30px 0" }}>
          {adminItems.map((item, index) => {
            const active = isActive(item.path);
            const isHovered = hoveredItem === item.path;

            return (
              <li key={index} style={{ marginBottom: "8px" }}>
                <Link
                  href={item.path}
                  onMouseEnter={() => setHoveredItem(item.path)}
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
                    textDecoration: "none",
                    outline: "none",

                    border:
                      active || isHovered
                        ? "1px solid #bd8e48"
                        : "1px solid transparent",

                    backgroundColor: active
                      ? "#bd8e48"
                      : isHovered
                      ? "rgba(189, 142, 72, 0.05)"
                      : "transparent",

                    color: active
                      ? "#000"
                      : isHovered
                      ? "#fff"
                      : "rgba(255,255,255,0.4)",

                    boxShadow:
                      isHovered && !active
                        ? "0 0 15px rgba(189, 142, 72, 0.3)"
                        : active
                        ? "0 4px 20px rgba(189, 142, 72, 0.4)"
                        : "none",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      color: active ? "#000" : "#bd8e48",
                    }}
                  >
                    {item.icon}
                  </span>
                  <span
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: active ? "700" : "500",
                    }}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* SECCIÓN SUPER ADMIN - SOLO VISIBLE PARA SUPER_ADMIN */}
        {session?.user?.role === "SUPER_ADMIN" && (
          <>
            <div
              style={{
                height: "1px",
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
                margin: "20px 0",
              }}
            />

            <div
              style={{
                fontSize: "0.75rem",
                textTransform: "uppercase",
                color: "#bd8e48",
                marginBottom: "15px",
                paddingLeft: "10px",
                fontWeight: 700,
                letterSpacing: "1px",
              }}
            >
              Super Admin
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {superAdminItems.map((item, index) => {
                const active = isActive(item.path);
                const isHovered = hoveredItem === item.path;

                return (
                  <li key={index} style={{ marginBottom: "8px" }}>
                    <Link
                      href={item.path}
                      onMouseEnter={() => setHoveredItem(item.path)}
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
                        textDecoration: "none",
                        outline: "none",

                        border:
                          active || isHovered
                            ? "1px solid #bd8e48"
                            : "1px solid transparent",

                        borderColor:
                          active || isHovered
                            ? active
                              ? "#bd8e48"
                              : "#bd8e48"
                            : "transparent",

                        backgroundColor: active
                          ? "#bd8e48"
                          : isHovered
                          ? "rgba(189, 142, 72, 0.05)"
                          : "transparent",

                        color: active
                          ? "#000"
                          : isHovered
                          ? "#fff"
                          : "rgba(255,255,255,0.4)",

                        boxShadow:
                          isHovered && !active
                            ? "0 0 15px rgba(189, 142, 72, 0.3)"
                            : active
                            ? "0 4px 20px rgba(189, 142, 72, 0.4)"
                            : "none",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          color: active ? "#000" : "#bd8e48",
                        }}
                      >
                        {item.icon}
                      </span>
                      <span
                        style={{
                          fontSize: "0.95rem",
                          fontWeight: active ? "700" : "500",
                        }}
                      >
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
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
