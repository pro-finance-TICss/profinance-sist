"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { Footer } from "../../components/layout/Footer";
import { Menu } from "lucide-react";
import { useSessionValidator } from "@/hooks/useSessionValidator";
import { DashboardProvider, useDashboard } from "@/contexts/DashboardContext";
import { Z_INDEX } from "@/constants/zIndex";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </DashboardProvider>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isMobile, isTablet, isDesktop, isSidebarOpen, closeSidebar, toggleSidebar, isCollapsed, toggleCollapse } = useDashboard();

  // Validar sesión cada 30 segundos y cuando la ventana recupere el foco
  useSessionValidator(30000);

  // Determinar título basado en la ruta
  const getTitle = (path: string) => {
    if (path === "/dashboard") return "Resumen Financiero";
    if (path.includes("/productos")) return "Productos";
    if (path.includes("/billetera")) return "Mi Billetera";
    if (path.includes("/ajustes/dispositivos"))
      return "Dispositivos Conectados";
    if (path.includes("/ajustes")) return "Ajustes";
    if (path.includes("/soporte")) return "Soporte";
    if (path.includes("/inversiones")) return "Inversiones";
    if (path.includes("/transacciones")) return "Transacciones";
    if (path.includes("/seguridad")) return "Seguridad"; // Fallback
    return "Dashboard";
  };

  const title = getTitle(pathname);

  // Determinar el ancho del sidebar dinámicamente
  const sidebarWidth = isCollapsed && !isMobile ? "80px" : "260px";
  const isDrawerMode = isMobile;

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        backgroundColor: "#000",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* 🦅 EL LOGO DEL ÁGUILA (Fondo) */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: isMobile ? "50%" : "62%",
          transform: "translate(-50%, -50%)",
          width: isMobile ? "250vw" : "100vh",
          height: isMobile ? "250vw" : "100vh",
          backgroundImage: 'url("/Background-recortado.png")',
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
          opacity: 0.04,
          pointerEvents: "none",
          zIndex: Z_INDEX.BACKGROUND,
        }}
      />

      {/* SIDEBAR con control móvil y colapsado */}
      <aside
        style={{
          width: sidebarWidth,
          flexShrink: 0,
          backgroundColor: "#000",
          borderRight: "1px solid rgba(189, 142, 72, 0.1)",
          zIndex: Z_INDEX.SIDEBAR,
          // CAMBIO: Usamos 'fixed' para que no se mueva, pero 'left: 0' siempre
          position: isMobile ? "absolute" : "fixed",
          left: isMobile ? (isSidebarOpen ? "0" : "-260px") : "0",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          height: "100vh",
        }}
      >
        <Sidebar onNavigate={closeSidebar} />
      </aside>

      {/* OVERLAY MENÚ MÓVIL */}
      {/* COMENTA TODO ESTE BLOQUE
      {isMobile && isSidebarOpen && (
        <div
          onClick={closeSidebar}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            zIndex: Z_INDEX.OVERLAY,
            backdropFilter: "blur(4px)",
          }}
        />
      )} 
*/}

      {/* CONTENEDOR DERECHO (Main Content) */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          zIndex: Z_INDEX.CONTENT,
          position: "relative",
          backgroundColor: "transparent",
          // --- INTEGRACIÓN DE SEGURIDAD (RESPETANDO AL AGENTE) ---
          // Usamos su variable 'sidebarWidth' para empujar el contenido
          marginLeft: !isMobile ? sidebarWidth : "0",
          // Usamos su misma transición para que todo se mueva en conjunto
          transition: "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1), all 0.3s ease",
          // Calculamos el ancho restante para que nada se desborde a la derecha
          width: !isMobile ? `calc(100vw - ${sidebarWidth})` : "100%",
        }}
      >
        {/* BOTÓN MENÚ MÓVIL/TABLET (drawer) */}
        {isDrawerMode && (
          <button
            onClick={toggleSidebar}
            style={{
              position: "absolute",
              top: "20px",
              left: "20px",
              zIndex: Z_INDEX.MOBILE_MENU_BUTTON,
              background: "rgba(189, 142, 72, 0.1)",
              border: "1px solid rgba(189, 142, 72, 0.3)",
              borderRadius: "8px",
              padding: "12px",
              color: "#bd8e48",
              cursor: "pointer",
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(189, 142, 72, 0.2)";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(189, 142, 72, 0.1)";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <Menu size={24} />
          </button>
        )}

        <DashboardHeader title={title} />

        <main
          className="custom-scrollbar"
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "transparent",
            position: "relative",
            height: "100%", // Asegurar altura para scroll
          }}
        >
          <div
            style={{
              padding: isMobile ? "20px" : isTablet ? "20px" : "30px 40px",
              display: "flex",
              flexDirection: "column",
              gap: isMobile ? "1.5rem" : "2.5rem",
              marginTop: isMobile ? "60px" : "0",
              flex: "1 0 auto",
              minHeight: "min-content",
            }}
          >
            {/* Header de la sección actual se renderiza aquí para consistencia */}
            <div>
              <h1
                style={{
                  fontSize: isMobile ? "1.4rem" : isTablet ? "1.6rem" : "1.8rem",
                  color: "#fff",
                  margin: 0,
                }}
              >
                {title}
              </h1>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>
                {title === "Resumen Financiero"
                  ? "Monitorea tus activos en tiempo real."
                  : title === "Ajustes"
                    ? "Gestiona tu perfil y preferencias."
                    : `Gestión de ${title.toLowerCase()}.`}
              </p>
            </div>

            {children}
          </div>

          {/* Footer al final del flujo, flex-shrink 0 para no encogerse */}
          <div style={{ flexShrink: 0, marginTop: "auto" }}>
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}
