"use client";
import React from "react";
import { Search, Bell, User, Menu } from "lucide-react"; // Solo añadimos Menu
import { useDashboard } from "@/contexts/DashboardContext";

export const DashboardHeader = ({ title }: { title: string }) => {
  // Añadimos isCollapsed a la extracción del contexto
  const { isMobile, isTablet, isCollapsed, toggleSidebar } = useDashboard();

  return (
    <header
      style={{
        height: isMobile ? "60px" : "80px",
        padding: isMobile ? "0 15px" : "0 30px",
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
      {/* 1. TÍTULO DINÁMICO (Oculto en móvil para ahorrar espacio) */}
      {!isMobile && (
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
            SISTEMA DE GESTIÓN PRO
          </span>
        </div>
      )}

      {/* 2. BUSCADOR CENTRAL MEJORADO (Oculto en móvil) */}
      {!isMobile && (
        <div style={{ flex: isTablet ? 0.3 : 0.4, position: "relative" }}>
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
            placeholder="Buscar activos, transacciones..."
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
      )}

      {/* 3. PERFIL Y NOTIFICACIONES */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? "12px" : "25px",
          marginLeft: "auto",
          paddingRight: isMobile ? "50px" : "0",
          transition: "all 0.3s ease"
        }}
      >
        {/* CAMBIO CLAVE: Si es Tablet o Desktop, la hamburguesa desaparece 100% */}
        {isMobile && (
          <button
            onClick={toggleSidebar}
            style={{
              position: "absolute",
              right: "15px",
              background: "none",
              border: "none",
              color: "#bd8e48",
              cursor: "pointer",
              // ESTA ES LA CLAVE TÉCNICA:
              // Si el ancho es mayor o igual a 768px (Tablet), lo ocultamos a la fuerza.
              display: typeof window !== "undefined" && window.innerWidth >= 768 ? "none" : "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 60
            }}
          >
            <Menu size={24} />
          </button>
        )}
        <NotificationBell />

        {/* Perfil de Socio */}
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
              Socio Pro-Finance
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
              Platinum Member
            </p>
          </div>

          {/* Avatar con el estilo de la marca */}
          <Link href="/dashboard/ajustes?tab=profile">
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
                cursor: "pointer",
              }}
            >
              <User size={22} color="#000" />
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
};

// ============================================================================
// COMPONENTE DE NOTIFICACIONES (INTERNO)
// ============================================================================
import { useState, useEffect, useRef } from "react";
import {
  getRecentNotifications,
  markAsRead,
  markAllAsRead,
} from "@/lib/actions/notifications";
import {
  X,
  Check,
  AlertTriangle,
  Info,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link"; // Agregado para el link del perfil

function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    const { notifications: list, unreadCount: c } =
      await getRecentNotifications();
    setNotifications(list);
    setUnreadCount(c);
  };

  useEffect(() => {
    loadNotifications();
    // Polling simple cada 30s
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await markAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAll = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "WARNING":
        return <AlertTriangle size={16} color="#ffc107" />;
      case "ERROR":
        return <AlertCircle size={16} color="#dc3545" />;
      case "SUCCESS":
        return <CheckCircle size={16} color="#28a745" />;
      default:
        return <Info size={16} color="#17a2b8" />;
    }
  };

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <div
        style={{
          cursor: "pointer",
          position: "relative",
          padding: "12px",
          borderRadius: "8px",
          transition: "background 0.3s",
          backgroundColor: isOpen ? "rgba(189, 142, 72, 0.1)" : "transparent",
        }}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = "rgba(189, 142, 72, 0.1)")
        }
        onMouseLeave={(e) =>
          !isOpen && (e.currentTarget.style.backgroundColor = "transparent")
        }
      >
        <Bell size={20} color="#bd8e48" />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "5px",
              right: "5px",
              width: "8px",
              height: "8px",
              backgroundColor: "#ff4d4d",
              borderRadius: "50%",
              border: "1px solid #111",
              boxShadow: "0 0 5px rgba(255, 77, 77, 0.5)",
            }}
          />
        )}
      </div>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "40px",
            right: "-10px",
            width: "320px",
            backgroundColor: "#1a1a1a",
            border: "1px solid rgba(189, 142, 72, 0.3)",
            borderRadius: "12px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            overflow: "hidden",
            zIndex: 100,
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{ color: "#fff", fontSize: "0.9rem", fontWeight: "600" }}
            >
              Notificaciones
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                style={{
                  background: "none",
                  border: "none",
                  color: "#bd8e48",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                Marcar todo leído
              </button>
            )}
          </div>

          <div className="custom-scrollbar" style={{ maxHeight: "300px", overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "rgba(255,255,255,0.4)",
                  fontSize: "0.85rem",
                }}
              >
                No tienes notificaciones
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    display: "flex",
                    gap: "12px",
                    alignItems: "start",
                    backgroundColor: n.read
                      ? "transparent"
                      : "rgba(189, 142, 72, 0.05)",
                    transition: "background 0.3s",
                    opacity: n.read ? 0.6 : 1,
                  }}
                >
                  <div style={{ marginTop: "3px" }}>{getIcon(n.type)}</div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        color: "#fff",
                        fontSize: "0.85rem",
                        fontWeight: "500",
                        marginBottom: "2px",
                      }}
                    >
                      {n.title}
                    </div>
                    <div
                      style={{
                        color: "rgba(255,255,255,0.6)",
                        fontSize: "0.75rem",
                        lineHeight: "1.3",
                      }}
                    >
                      {n.message}
                    </div>
                    <div
                      style={{
                        color: "rgba(255,255,255,0.3)",
                        fontSize: "0.7rem",
                        marginTop: "4px",
                      }}
                    >
                      {new Date(n.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                  {!n.read && (
                    <button
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "rgba(255,255,255,0.3)",
                        padding: "2px",
                      }}
                      title="Marcar como leída"
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
