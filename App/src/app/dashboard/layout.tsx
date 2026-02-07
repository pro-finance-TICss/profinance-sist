"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { Footer } from "../../components/layout/Footer";
import { useSessionValidator } from "@/hooks/useSessionValidator";
import { DashboardProvider, useDashboard } from "@/contexts/DashboardContext";
import { useAccount } from "@/contexts/AccountContext";

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
  const router = useRouter();
  const { isMobile, isSidebarOpen, closeSidebar, isCollapsed } = useDashboard();
  const { activeAccount, isLoading: isLoadingAccount } = useAccount();

  useSessionValidator(30000);

  // ================================================================
  // GUARD: Redirigir a /select-account si no hay cuenta activa
  // ================================================================
  React.useEffect(() => {
    if (!isLoadingAccount && !activeAccount) {
      console.log("⚠️ No hay cuenta activa, redirigiendo a /select-account");
      router.replace("/select-account");
    }
  }, [activeAccount, isLoadingAccount, router]);

  // ================================================================
  // PREVENCIÓN DE FOUC: No renderizar hasta que haya cuenta activa
  // ================================================================
  if (isLoadingAccount || !activeAccount) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "1rem",
          backgroundColor: "#000",
        }}
      >
        <div
          style={{
            width: "50px",
            height: "50px",
            border: "4px solid rgba(189, 142, 72, 0.2)",
            borderTop: "4px solid var(--color-gold-start)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.9rem" }}>
          Cargando dashboard...
        </p>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const getTitle = (path: string) => {
    if (path === "/dashboard") return "Resumen Financiero";
    if (path.includes("/productos")) return "Productos";
    if (path.includes("/billetera")) return "Mi Billetera";
    if (path.includes("/ajustes/dispositivos")) return "Dispositivos Conectados";
    if (path.includes("/ajustes")) return "Ajustes";
    if (path.includes("/soporte")) return "Soporte";
    if (path.includes("/inversiones")) return "Inversiones";
    if (path.includes("/transacciones")) return "Transacciones";
    return "Dashboard";
  };

  const title = getTitle(pathname);

  return (
    <div className="dashboard-layout-root" style={{ display: "flex", height: "100vh", width: "100vw", backgroundColor: "#000", overflow: "hidden", position: "relative" }}>

      {/* 🦅 FONDO: Controlado 100% por CSS */}
      <div className="eagle-bg" />

      {/* 🛡️ SIDEBAR: Clase estables para CSS-First */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <Sidebar onNavigate={closeSidebar} />
      </aside>

      {/* 🌑 OVERLAY: Visibilidad gestionada por CSS */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`}
        onClick={closeSidebar}
      />

      {/* 🚀 MAIN WRAPPER */}
      <div className="main-content-wrapper" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative", zIndex: 5 }}>

        {/* El Header es Fixed, así que no empuja el contenido hacia abajo */}
        <DashboardHeader title={title} />

        <main className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

          {/* CONTENEDOR DE CONTENIDO CON ESPACIADO PARA EL HEADER */}
          <div style={{
            /* IMPORTANTE: Este marginTop compensa el Header Fixed para que el contenido no se tape */
            marginTop: isMobile ? "var(--header-height-mobile)" : "var(--header-height-desktop)",
            padding: isMobile ? "20px" : "40px",
            flex: "1 0 auto",
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? "1.5rem" : "2.5rem",
            width: "100%"
          }}>
            {children}
          </div>

          <Footer />
        </main>
      </div>
    </div>
  );
}
