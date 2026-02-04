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
        className="eagle-bg" // <--- Añadimos la clase
        style={{
          position: "fixed",
          top: "50%",
          transform: "translate(-50%, -50%)",
          backgroundImage: 'url("/Background-recortado.png")',
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
          opacity: 0.04,
          pointerEvents: "none",
          zIndex: Z_INDEX.BACKGROUND,
        }}
      />

      {/* SIDEBAR - CSS-FIRST */}
      <aside
        className={`sidebar ${isSidebarOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}
      >
        <Sidebar onNavigate={closeSidebar} />
      </aside>

      {/* OVERLAY - CSS-FIRST */}
      <div
        className={`sidebar-overlay ${isSidebarOpen && (isMobile || (isTablet && !isCollapsed)) ? 'visible' : ''}`}
        onClick={closeSidebar}
      />

      {/* CONTENEDOR DERECHO (Main Content) */}
      <div
        className="main-content-wrapper"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          position: "relative",
          backgroundColor: "transparent",
          zIndex: 5,
          transition: "all 0.3s ease",
          /* ELIMINAMOS: marginLeft, width y paddings que dependían de isMobile/isTablet */
        }}
      >

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
            height: "100%",
          }}
        >
          {/* AQUÍ ESTÁ EL CAMBIO: Quitamos la clase "main-content-wrapper" de este div */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: isMobile ? "1.5rem" : "2.5rem",
              flex: "1 0 auto",
              minHeight: "min-content",
            }}
          >
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
