"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "../../components/layout/Sidebar";
import { DashboardHeader } from "../../components/layout/DashboardHeader";
import { Footer } from "../../components/layout/Footer";
import { Menu } from "lucide-react";
import { useSessionValidator } from "@/hooks/useSessionValidator";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Validar sesión cada 30 segundos y cuando la ventana recupere el foco
  useSessionValidator(30000);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
          zIndex: 0,
        }}
      />

      {/* SIDEBAR con control móvil */}
      <aside
        style={{
          width: "260px",
          flexShrink: 0,
          backgroundColor: "#000",
          borderRight: "1px solid rgba(189, 142, 72, 0.1)",
          zIndex: 100,
          position: isMobile ? "absolute" : "relative",
          left: isMobile ? (isMobileMenuOpen ? "0" : "-260px") : "0",
          transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          height: "100%",
        }}
      >
        <Sidebar
          onNavigate={() => {
            if (isMobile) setIsMobileMenuOpen(false);
          }}
        />
      </aside>

      {/* OVERLAY MENÚ MÓVIL */}
      {isMobile && isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            zIndex: 90,
            backdropFilter: "blur(4px)",
          }}
        />
      )}

      {/* CONTENEDOR DERECHO (Main Content) */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          zIndex: 5,
          position: "relative",
          backgroundColor: "transparent",
        }}
      >
        {isMobile && (
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            style={{
              position: "absolute",
              top: "20px",
              left: "20px",
              zIndex: 80,
              background: "rgba(189, 142, 72, 0.1)",
              border: "1px solid rgba(189, 142, 72, 0.3)",
              borderRadius: "8px",
              padding: "8px",
              color: "#bd8e48",
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
              padding: isMobile ? "20px" : "30px 40px",
              display: "flex",
              flexDirection: "column",
              gap: isMobile ? "1.5rem" : "2.5rem",
              marginTop: isMobile ? "40px" : "0",
              flex: "1 0 auto", // Flex grow, don't shrink, auto basis
              minHeight: "min-content", // Allow content to dictate height
            }}
          >
            {/* Header de la sección actual se renderiza aquí para consistencia */}
            <div>
              <h1
                style={{
                  fontSize: isMobile ? "1.4rem" : "1.8rem",
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
