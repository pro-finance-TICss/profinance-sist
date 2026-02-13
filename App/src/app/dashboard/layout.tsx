"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { Footer } from "../../components/layout/Footer";
import { useSessionValidator } from "@/hooks/useSessionValidator";
import { DashboardProvider, useDashboard } from "@/contexts/DashboardContext";
import { useAccount } from "@/contexts/AccountContext"; // Rama10: Crucial para multicuenta
import { CurrencyProvider } from "@/contexts/CurrencyContext"; // Main: Soporte de divisas
import { Z_INDEX } from "@/constants/zIndex";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <CurrencyProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </CurrencyProvider>
    </DashboardProvider>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, isTablet, isSidebarOpen, closeSidebar, isCollapsed } = useDashboard();
  const { activeAccount, isLoading: isLoadingAccount } = useAccount();

  useSessionValidator(30000);

  // 🛡️ GUARD (Rama10): Redirigir si no hay cuenta activa
  React.useEffect(() => {
    if (!isLoadingAccount && !activeAccount) {
      router.replace("/select-account");
    }
  }, [activeAccount, isLoadingAccount, router]);

  // 🛡️ CARGA (Rama10): Spinner preventivo
  if (isLoadingAccount || !activeAccount) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem", backgroundColor: "#000" }}>
        <div style={{ width: "50px", height: "50px", border: "4px solid rgba(189, 142, 72, 0.2)", borderTop: "4px solid var(--color-gold-start)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.9rem" }}>Cargando dashboard...</p>
        <style jsx>{` @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } `}</style>
      </div>
    );
  }

  const title = getTitle(pathname);

  return (
    <div className="dashboard-layout-root" style={{ display: "flex", height: "100vh", width: "100vw", backgroundColor: "#000", overflow: "hidden", position: "relative" }}>
      <div className="eagle-bg" />

      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <Sidebar onNavigate={closeSidebar} />
      </aside>

      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`}
        // Usamos el nombre exacto definido en el archivo de constantes
        style={{ zIndex: Z_INDEX.OVERLAY }}
        onClick={closeSidebar}
      />

      <div className="main-content-wrapper" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative", zIndex: 5 }}>
        <DashboardHeader title={title} />

        <main className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

          <div style={{
            marginTop: isMobile ? "var(--header-height-mobile)" : "var(--header-height-desktop)",
            backgroundColor: "transparent",
            position: "relative",
            flex: "1 0 auto",
            display: "flex",
            flexDirection: "column",
          }}>
            {/* 🎨 UI de MAIN: Encabezados dinámicos */}
            <div style={{
              padding: isMobile ? "20px" : isTablet ? "20px" : "30px 40px",
              display: "flex",
              flexDirection: "column",
              gap: isMobile ? "1.5rem" : "2.5rem",
              flex: "1 0 auto",
              minHeight: "min-content",
            }}>
              <header>
                <h1 style={{ fontSize: isMobile ? "1.4rem" : isTablet ? "1.6rem" : "1.8rem", color: "#fff", margin: 0 }}>
                  {title}
                </h1>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>
                  {title === "Resumen Financiero" ? "Monitorea tus activos en tiempo real." :
                    title === "Ajustes" ? "Gestiona tu perfil y preferencias." :
                      title === "Transacciones" ? "Historial de movimientos." : `Gestión de ${title}.`}
                </p>
              </header>

              {children}
            </div>
            <Footer />
          </div>
        </main>
      </div>
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
};// Función getTitle omitida por brevedad, debe mantenerse igual.