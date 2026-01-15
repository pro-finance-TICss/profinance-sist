# 🎯 Ejemplo Práctico: Refactorización de layout.tsx

Este archivo muestra cómo quedaría tu `layout.tsx` después de integrar el `DashboardContext`.

## ✅ Versión Refactorizada (Recomendada)

```typescript
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
  const { isMobile, isTablet, isDesktop, isSidebarOpen, closeSidebar, toggleSidebar } = useDashboard();

  // Validar sesión cada 30 segundos y cuando la ventana recupere el foco
  useSessionValidator(30000);

  // ❌ ELIMINADO: Estados locales duplicados
  // const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // const [isMobile, setIsMobile] = useState(false);
  // useEffect(() => { ... resize listener ... }, []);

  // Determinar título basado en la ruta
  const getTitle = (path: string) => {
    if (path === "/dashboard") return "Resumen Financiero";
    if (path.includes("/productos")) return "Productos";
    if (path.includes("/billetera")) return "Mi Billetera";
    if (path.includes("/ajustes/dispositivos")) return "Dispositivos Conectados";
    if (path.includes("/ajustes")) return "Ajustes";
    if (path.includes("/soporte")) return "Soporte";
    if (path.includes("/inversiones")) return "Inversiones";
    if (path.includes("/transacciones")) return "Transacciones";
    if (path.includes("/seguridad")) return "Seguridad";
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
          zIndex: Z_INDEX.BACKGROUND, // ← Usando constante
        }}
      />

      {/* SIDEBAR con control móvil */}
      <aside
        style={{
          width: "260px",
          flexShrink: 0,
          backgroundColor: "#000",
          borderRight: "1px solid rgba(189, 142, 72, 0.1)",
          zIndex: Z_INDEX.SIDEBAR, // ← Usando constante
          position: isMobile || isTablet ? "absolute" : "relative", // ← Soporte tablet
          left: isMobile || isTablet ? (isSidebarOpen ? "0" : "-260px") : "0",
          transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          height: "100%",
        }}
      >
        <Sidebar onNavigate={closeSidebar} />
      </aside>

      {/* OVERLAY MENÚ MÓVIL */}
      {(isMobile || isTablet) && isSidebarOpen && (
        <div
          onClick={closeSidebar}
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            zIndex: Z_INDEX.OVERLAY, // ← Usando constante
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
          zIndex: Z_INDEX.CONTENT, // ← Usando constante
          position: "relative",
          backgroundColor: "transparent",
        }}
      >
        {/* Botón de menú móvil */}
        {(isMobile || isTablet) && (
          <button
            onClick={toggleSidebar}
            style={{
              position: "absolute",
              top: "20px",
              left: "20px",
              zIndex: Z_INDEX.MOBILE_MENU_BUTTON, // ← Usando constante
              background: "rgba(189, 142, 72, 0.1)",
              border: "1px solid rgba(189, 142, 72, 0.3)",
              borderRadius: "8px",
              padding: "12px", // ← Aumentado de 8px a 12px (área táctil 48x48px)
              color: "#bd8e48",
              cursor: "pointer",
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
            height: "100%",
          }}
        >
          <div
            style={{
              padding: isMobile ? "20px" : isTablet ? "25px" : "30px 40px", // ← Soporte tablet
              display: "flex",
              flexDirection: "column",
              gap: isMobile ? "1.5rem" : "2.5rem",
              marginTop: isMobile || isTablet ? "60px" : "0", // ← Ajuste para botón móvil
              flex: "1 0 auto",
              minHeight: "min-content",
            }}
          >
            {/* Header de la sección actual */}
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

          {/* Footer al final del flujo */}
          <div style={{ flexShrink: 0, marginTop: "auto" }}>
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}
```

## 📊 Cambios Realizados

### ✅ Eliminado
- ❌ `const [isMobile, setIsMobile] = useState(false)`
- ❌ `const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)`
- ❌ `useEffect(() => { ... resize listener ... }, [])`

### ✅ Agregado
- ✅ `import { DashboardProvider, useDashboard } from "@/contexts/DashboardContext"`
- ✅ `import { Z_INDEX } from "@/constants/zIndex"`
- ✅ Wrapper `<DashboardProvider>` alrededor del contenido
- ✅ Componente interno `DashboardLayoutContent` que consume el contexto
- ✅ Uso de `const { isMobile, isTablet, isDesktop, isSidebarOpen, closeSidebar, toggleSidebar } = useDashboard()`

### ✅ Mejorado
- ✅ Soporte para tablets (`isTablet`)
- ✅ Z-index usando constantes centralizadas
- ✅ Área táctil del botón de menú aumentada a 48x48px
- ✅ Padding adaptativo para tablets

## 🎯 Beneficios

1. **Menos código**: ~15 líneas eliminadas
2. **Mejor rendimiento**: Un solo event listener en lugar de múltiples
3. **Escalabilidad**: Fácil añadir nuevos breakpoints o estados
4. **Mantenibilidad**: Cambios en un solo lugar
5. **Type-safety**: TypeScript valida el uso del contexto
