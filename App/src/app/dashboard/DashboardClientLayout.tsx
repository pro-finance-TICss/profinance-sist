"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { Footer } from "../../components/layout/Footer";
import { useSessionValidator } from "@/hooks/useSessionValidator";
import { DashboardProvider, useDashboard } from "@/contexts/DashboardContext";
import { useAccount } from "@/contexts/AccountContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { Z_INDEX } from "@/constants/zIndex";

export default function DashboardClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardProvider>
      <CurrencyProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </CurrencyProvider>
    </DashboardProvider>
  );
}

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, isTablet, isSidebarOpen, closeSidebar, isCollapsed } =
    useDashboard();
  const { accounts, activeAccount, isLoading: isLoadingAccount } = useAccount();

  useSessionValidator(30000);

  React.useEffect(() => {
    if (!isLoadingAccount && accounts.length === 0) {
      router.replace("/dashboard");
    }
  }, [accounts, isLoadingAccount, router]);

  if (isLoadingAccount) {
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
        <p
          style={{
            color: "rgba(255, 255, 255, 0.7)",
            fontSize: "0.9rem",
          }}
        >
          Cargando dashboard...
        </p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const title = getTitle(pathname);

  return (
    <div
      className="dashboard-layout-root"
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        backgroundColor: "#000",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div className="eagle-bg" />

      <aside
        className={`sidebar ${isSidebarOpen ? "open" : ""} ${
          isCollapsed ? "collapsed" : ""
        }`}
      >
        <Sidebar onNavigate={closeSidebar} />
      </aside>

      <div
        className={`sidebar-overlay ${isSidebarOpen ? "visible" : ""}`}
        style={{ zIndex: Z_INDEX.OVERLAY }}
        onClick={closeSidebar}
      />

      <div
        className="main-content-wrapper"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          position: "relative",
          zIndex: 5,
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
          }}
        >
          <div
            style={{
              marginTop: isMobile
                ? "var(--header-height-mobile)"
                : "var(--header-height-desktop)",
              backgroundColor: "transparent",
              position: "relative",
              flex: "1 0 auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: isMobile
                  ? "20px"
                  : isTablet
                  ? "20px"
                  : "30px 40px",
                display: "flex",
                flexDirection: "column",
                gap: isMobile ? "1.5rem" : "2.5rem",
                flex: "1 0 auto",
                minHeight: "min-content",
              }}
            >
              {children}
            </div>

            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}

function getTitle(path: string) {
  if (path === "/dashboard") return "Resumen Financiero";
  if (path.includes("/productos")) return "Productos";
  if (path.includes("/billetera")) return "Mi Billetera";
  if (path.includes("/ajustes/dispositivos"))
    return "Dispositivos Conectados";
  if (path.includes("/ajustes")) return "Ajustes";
  if (path.includes("/soporte")) return "Soporte";
  if (path.includes("/inversiones")) return "Inversiones";
  if (path.includes("/transacciones")) return "Transacciones";
  return "Dashboard";
}
