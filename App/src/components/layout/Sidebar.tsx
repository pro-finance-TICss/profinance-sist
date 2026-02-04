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
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useDashboard } from "@/contexts/DashboardContext";

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const {
    isSidebarOpen,
    isMobile,
    isTablet,
    isDesktop,
    isCollapsed,
    toggleCollapse // <- Esta es la pieza clave que nos faltaba
  } = useDashboard();
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Nota: width, position, left, zIndex ahora controlados por CSS vía clases
  // JS solo maneja estados de interacción (isCollapsed, isMobile, etc.)

  const menuItems = [
    {
      icon: <LayoutDashboard size={22} />,
      label: "Inicio",
      href: "/dashboard",
    },
    {
      icon: <Package size={22} />,
      label: "Productos",
      href: "/dashboard/productos",
    },
    {
      icon: <BarChart3 size={22} />,
      label: "Inversiones",
      href: "/dashboard/inversiones",
    },
    {
      icon: <Wallet size={22} />,
      label: "Mi Billetera",
      href: "/dashboard/billetera",
    },
    {
      icon: <History size={22} />,
      label: "Transacciones",
      href: "/dashboard/transacciones",
    },
    {
      icon: <Settings2 size={22} />,
      label: "Ajustes",
      href: "/dashboard/ajustes",
    },
    {
      icon: <LifeBuoy size={22} />,
      label: "Soporte",
      href: "/dashboard/soporte",
    },
  ];

  const handleNavigation = () => {
    if (onNavigate) onNavigate();
  };

  return (
    <aside className={`sidebar ${isCollapsed ? "collapsed" : ""} ${isSidebarOpen ? "open" : ""}`}>
      {/* HEADER DEL SIDEBAR: LOGO */}
      <div style={{ marginTop: "35px", marginBottom: "40px", padding: "0 20px" }}>
        <div
          style={{
            backgroundColor: "rgba(189, 142, 72, 0.03)",
            borderRadius: "16px",
            padding: isCollapsed && !isMobile ? "15px" : "20px",
            border: "1px solid rgba(189, 142, 72, 0.15)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
            overflow: "hidden",
            boxShadow: "inset 0 0 20px rgba(189, 142, 72, 0.05)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
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
              maxWidth: isCollapsed && !isMobile ? "55px" : "180px",
              position: "relative",
              zIndex: 1,
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
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

      {/* BOTÓN DE COLAPSO - Visible solo en Tablet (bloqueado en Desktop) */}
      <button
        onClick={toggleCollapse}
        className="collapse-button"
        style={{
          position: "absolute",
          right: "12px",
          top: "12px",
          zIndex: 101,
          // Escalamos a 42px para una presencia fuerte
          width: "42px",
          height: "42px",
          backgroundColor: "rgba(189, 142, 72, 0.12)",
          border: "1px solid rgba(189, 142, 72, 0.4)",
          borderRadius: "12px", // Aumentamos radio para suavizar el tamaño grande
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "#bd8e48",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)", // Añadimos una sombra sutil
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(189, 142, 72, 0.2)";
          e.currentTarget.style.borderColor = "rgba(189, 142, 72, 0.8)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(189, 142, 72, 0.12)";
          e.currentTarget.style.borderColor = "rgba(189, 142, 72, 0.4)";
        }}
      >
        <svg
          // Icono más grande y definido
          width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8"
          style={{
            transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
          }}
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>


      {/* MENÚ DE NAVEGACIÓN */}
      <nav style={{ flex: 1 }}>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {menuItems.map((item, index) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            const isHovered = hoveredItem === item.label;
            const showTooltip = isCollapsed && !isMobile && isHovered;

            return (
              <li
                key={index}
                style={{ marginBottom: "8px", padding: "0 15px", position: "relative" }}
              >
                <Link

                  href={item.href}

                  onClick={handleNavigation}

                  onMouseEnter={() => setHoveredItem(item.label)}

                  onMouseLeave={() => setHoveredItem(null)}
                  title={isCollapsed && !isMobile ? item.label : ""}

                  style={{

                    display: "flex",

                    alignItems: "center",

                    justifyContent: isCollapsed && !isMobile ? "center" : "flex-start",

                    gap: "15px",

                    width: "100%",

                    padding: isCollapsed && !isMobile ? "12px" : "12px 20px",

                    cursor: "pointer",

                    borderRadius: "12px",

                    textAlign: "left",

                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",

                    position: "relative",

                    outline: "none",
                    WebkitTapHighlightColor: "transparent",
                    textDecoration: "none",



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

                      !isActive && isHovered && !isCollapsed

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



                  {/* Texto del menú (oculto en modo colapsado) */}

                  {(!isCollapsed || isMobile) && (

                    <span

                      style={{

                        fontSize: "0.95rem",

                        fontWeight: isActive ? "700" : "500",

                        transition: "all 0.3s",

                      }}

                    >

                      {item.label}

                    </span>

                  )}

                </Link>

                {/* Tooltip para modo colapsado */}
                {showTooltip && (
                  <div
                    style={{
                      position: "absolute",
                      left: "calc(100% + 10px)",
                      top: "50%",
                      transform: "translateY(-50%)",
                      backgroundColor: "rgba(189, 142, 72, 0.95)",
                      color: "#000",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      whiteSpace: "nowrap",
                      zIndex: 1000,
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                      pointerEvents: "none",
                      animation: "fadeIn 0.2s ease-in-out",
                    }}
                  >
                    {item.label}
                    <div
                      style={{
                        position: "absolute",
                        left: "-6px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 0,
                        height: 0,
                        borderTop: "6px solid transparent",
                        borderBottom: "6px solid transparent",
                        borderRight: "6px solid rgba(189, 142, 72, 0.95)",
                      }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* BOTÓN DE LOGOUT */}
      <div style={{ padding: "0 15px" }}>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed && !isMobile ? "center" : "flex-start",
            gap: "15px",
            width: "100%",
            padding: isCollapsed && !isMobile ? "12px" : "12px 20px",
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
          {(!isCollapsed || isMobile) && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
}
