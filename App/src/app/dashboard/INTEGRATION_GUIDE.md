# 📘 Guía de Integración: DashboardContext + useMediaQuery

## 🎯 Objetivo

Integrar el nuevo sistema de gestión de estado responsive en tu `layout.tsx` y componentes hijos sin romper la funcionalidad actual.

---

## 📦 Archivos Creados

```
src/
├── constants/
│   ├── breakpoints.ts      ← Breakpoints centralizados
│   └── zIndex.ts            ← Escala de z-index
├── hooks/
│   └── useMediaQuery.ts     ← Hook de media queries
├── contexts/
│   └── DashboardContext.tsx ← Context Provider
└── app/dashboard/
    └── DashboardClientWrapper.tsx ← Wrapper para el Provider
```

---

## 🔧 Paso 1: Modificar `layout.tsx`

### Opción A: Layout como Client Component (Recomendado - Más Simple)

Si tu `layout.tsx` ya tiene `"use client"` al inicio, simplemente envuelve el contenido con el Provider:

```typescript
"use client";

import { DashboardProvider } from "@/contexts/DashboardContext";
import { useDashboard } from "@/contexts/DashboardContext";
// ... otros imports

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </DashboardProvider>
  );
}

// Componente interno que consume el contexto
function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { isMobile, isTablet, isDesktop, isSidebarOpen, closeSidebar, toggleSidebar } = useDashboard();
  
  // ELIMINAR estos estados locales (ya no son necesarios):
  // const [isMobile, setIsMobile] = useState(false);
  // const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // const useEffect con resize listener
  
  // Ahora usa los valores del contexto:
  return (
    <div style={{ display: "flex", height: "100vh", ... }}>
      {/* Sidebar */}
      <aside
        style={{
          position: isMobile ? "absolute" : "relative",
          left: isMobile ? (isSidebarOpen ? "0" : "-260px") : "0",
          // ... resto de estilos
        }}
      >
        <Sidebar onNavigate={closeSidebar} />
      </aside>

      {/* Overlay */}
      {isMobile && isSidebarOpen && (
        <div onClick={closeSidebar} style={{ ... }} />
      )}

      {/* Main Content */}
      <div style={{ flex: 1, ... }}>
        {isMobile && (
          <button onClick={toggleSidebar} style={{ ... }}>
            <Menu size={24} />
          </button>
        )}
        
        <DashboardHeader />
        <main>{children}</main>
      </div>
    </div>
  );
}
```

### Opción B: Layout como Server Component (Más Complejo)

Si necesitas mantener el layout como Server Component:

```typescript
// layout.tsx (SIN "use client")
import { DashboardClientWrapper } from "./DashboardClientWrapper";
// ... otros imports

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardClientWrapper>
      {/* Todo tu contenido actual aquí */}
      <div style={{ display: "flex", ... }}>
        {/* ... */}
      </div>
    </DashboardClientWrapper>
  );
}
```

Luego crea un componente separado que consuma el contexto.

---

## 🔧 Paso 2: Actualizar `Sidebar.tsx`

```typescript
"use client";

import { useDashboard } from "@/contexts/DashboardContext";
// ... otros imports

interface SidebarProps {
  onNavigate?: () => void; // Mantener por compatibilidad, pero ya no es necesario
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { closeSidebar } = useDashboard(); // ← NUEVO
  
  const handleNavigation = () => {
    closeSidebar(); // ← Usar el método del contexto
    if (onNavigate) onNavigate(); // Mantener por compatibilidad
  };

  // ELIMINAR el position: fixed del aside (línea 78)
  // El posicionamiento debe ser controlado por el layout
  
  return (
    <aside
      style={{
        width: "260px",
        height: "100vh",
        backgroundColor: "#000",
        // ELIMINAR: position: "fixed", left: 0, top: 0
        // ... resto de estilos
      }}
    >
      {/* ... contenido del sidebar */}
    </aside>
  );
}
```

---

## 🔧 Paso 3: Actualizar `page.tsx`

```typescript
"use client";

import { useDashboard } from "@/contexts/DashboardContext";
// ... otros imports

export default function DashboardPage() {
  const { isMobile } = useDashboard(); // ← NUEVO
  
  // ELIMINAR estos estados y efectos:
  // const [isMobile, setIsMobile] = useState(false);
  // React.useEffect(() => { ... }, []);

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "24px",
        }}
      >
        <div style={{ gridColumn: isMobile ? "span 12" : "span 8" }}>
          <BalanceSection />
        </div>
        {/* ... resto del contenido */}
      </div>
    </>
  );
}
```

---

## 🔧 Paso 4: Actualizar `DashboardHeader.tsx`

```typescript
"use client";

import { useDashboard } from "@/contexts/DashboardContext";
// ... otros imports

export const DashboardHeader = ({ title }: { title: string }) => {
  const { isMobile, isTablet } = useDashboard(); // ← NUEVO

  return (
    <header
      style={{
        height: isMobile ? "60px" : "80px", // ← Reducir en móvil
        padding: isMobile ? "0 15px" : "0 30px",
        // ... resto de estilos
      }}
    >
      {/* Ocultar título en móvil (ya está en el contenido) */}
      {!isMobile && (
        <div style={{ minWidth: "200px" }}>
          <h2>{title}</h2>
        </div>
      )}

      {/* Buscador: ocultar en móvil, reducir en tablet */}
      {!isMobile && (
        <div style={{ flex: isTablet ? 0.3 : 0.4 }}>
          {/* ... buscador */}
        </div>
      )}

      {/* Notificaciones y perfil */}
      <div style={{ display: "flex", alignItems: "center", gap: "25px" }}>
        <NotificationBell />
        {/* ... perfil */}
      </div>
    </header>
  );
};
```

---

## ✅ Checklist de Integración

- [ ] **Paso 1**: Envolver el layout con `DashboardProvider`
- [ ] **Paso 2**: Eliminar estados locales de `isMobile` en `layout.tsx`
- [ ] **Paso 3**: Eliminar `useEffect` con resize listener en `layout.tsx`
- [ ] **Paso 4**: Reemplazar `isMobileMenuOpen` con `isSidebarOpen` del contexto
- [ ] **Paso 5**: Actualizar `Sidebar.tsx` para usar `closeSidebar()`
- [ ] **Paso 6**: Eliminar `position: fixed` del `Sidebar.tsx` (línea 78)
- [ ] **Paso 7**: Actualizar `page.tsx` para usar `isMobile` del contexto
- [ ] **Paso 8**: Eliminar estados duplicados en `page.tsx`
- [ ] **Paso 9**: Actualizar `DashboardHeader.tsx` para adaptarse a breakpoints
- [ ] **Paso 10**: Probar en diferentes tamaños de pantalla

---

## 🧪 Cómo Probar

1. **Desktop (>1024px)**:
   - Sidebar visible y fijo
   - Header con todas las features
   - Grid de 2 columnas

2. **Tablet (768px-1023px)**:
   - Sidebar debe comportarse como en móvil (drawer)
   - Header con buscador reducido
   - Grid de 2 columnas o 1 columna según preferencia

3. **Mobile (<768px)**:
   - Sidebar como drawer
   - Header compacto (60px, sin título ni buscador)
   - Grid de 1 columna

---

## 🐛 Troubleshooting

### Error: "useDashboard must be used within a DashboardProvider"

**Causa**: Estás usando `useDashboard()` en un componente que no está dentro del Provider.

**Solución**: Asegúrate de que el `DashboardProvider` envuelve todo el contenido del dashboard en `layout.tsx`.

---

### El sidebar no se cierra en desktop

**Causa**: El efecto que cierra automáticamente el sidebar al pasar a desktop está funcionando.

**Verificación**: Revisa que el `useEffect` en `DashboardContext.tsx` esté activo.

---

### Hydration mismatch

**Causa**: El estado inicial de `useMediaQuery` es `false` para evitar este problema.

**Solución**: Si persiste, asegúrate de que no estés renderizando contenido diferente en el servidor vs cliente basado en `isMobile`.

---

## 📊 Beneficios Obtenidos

✅ **Eliminación de código duplicado**: Un solo lugar para detectar breakpoints  
✅ **Mejor rendimiento**: Un solo event listener en lugar de múltiples  
✅ **Escalabilidad**: Fácil añadir nuevos estados globales del dashboard  
✅ **Type-safety**: TypeScript valida el uso del contexto  
✅ **Mantenibilidad**: Cambiar breakpoints en un solo archivo  

---

## 🚀 Próximos Pasos (Semana 2)

Una vez integrado esto, podremos:
1. Implementar el Sidebar colapsado para tablets
2. Optimizar el Header móvil (ocultar elementos)
3. Mejorar el soporte táctil (eventos touch)
4. Aplicar la escala de z-index

---

**¿Necesitas ayuda con la integración? Avísame en qué paso estás y te guío.**
