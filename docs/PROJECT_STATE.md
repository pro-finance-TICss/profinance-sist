# PROFINANCE — Project State

Última actualización: 2026-02-03  
Responsable: [tu nombre / username]

---

## 🎯 Objetivo del Proyecto

Construir una aplicación web con una experiencia de responsividad y solidez
tipo Stripe / Binance:

- Layout determinista desde SSR
- Cero FOUC
- CLS < 0.01
- CSS-first (CSS controla el layout)
- JavaScript solo para interacción
- Refactorización incremental (sin reescritura)
- Estética dorada preservada 100%

---

## 🧠 Principios Arquitectónicos (NO NEGOCIABLES)

- CSS es la única fuente de verdad del layout
- No cálculo de layout en JavaScript
- Media queries nativas en CSS
- Sin estilos inline para dimensiones críticas
- Estados globales solo para interacción del usuario
- Breakpoints consistentes y centralizados
- Layout estable desde el primer paint (SSR)

---

## 🧭 Fases del Proyecto

### Fase 1 — Fundamentos CSS
**Estado:** ⚠️ En progreso (parcialmente implementada)

**Objetivo de la fase:**
- Definir variables CSS para dimensiones críticas
- Implementar media queries nativas
- Migrar layout de JS runtime a CSS-first
- Sidebar y Header controlados por CSS
- Reservar espacio con CSS Grid desde SSR

**Estado por breakpoint:**
- Desktop: ✔️ Estable y funcional
- Tablet: ⚠️ Parcial (requiere ajustes)
- Mobile: ❌ Incompleto

**Implementación actual confirmada:**
- Variables CSS definidas en `globals.css`
- Media queries nativas implementadas
- `dashboard/layout.tsx` migrado a clases CSS
- `Sidebar.tsx` sin estilos inline de layout
- `DashboardHeader.tsx` usando variables CSS de altura

**Archivos involucrados:**
- `src/app/globals.css`
- `src/app/dashboard/layout.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/DashboardHeader.tsx`

**Pendiente para cerrar la fase:**
- Ajustes correctos de Sidebar y Header en Tablet
- Ajustes completos en Mobile
- Verificación visual de CLS (sin saltos)
- Confirmar que no se rompe Desktop

---

### Fase 2 — Hidratación Transparente
**Estado:** ⏸️ Pendiente (NO iniciada)

**Objetivo de la fase:**
- Eliminar detección de viewport en JS
- Eliminar `isMobile`, `isTablet`, `resize listeners`
- Evitar cualquier cambio de layout post-hidratación
- Dejar `DashboardContext` solo para interacción

**Archivos previstos:**
- `src/contexts/DashboardContext.tsx`
- `src/hooks/useMediaQuery.ts`

⚠️ Nota importante:
Esta fase NO debe iniciarse hasta cerrar completamente la Fase 1
en Desktop, Tablet y Mobile.

---

### Fase 3 — Unificación y Pulido
**Estado:** ⏸️ Pendiente

**Objetivo de la fase:**
- Unificar arquitectura entre dashboard y admin
- Z-index completamente controlado por CSS
- Overlays siempre presentes en DOM
- Limpieza de deuda técnica
- Mejorar mantenibilidad general

---

## 📦 Estado Técnico Actual (Resumen Ejecutivo)

- Layout mayormente CSS-first
- Variables CSS para dimensiones críticas ya existen
- Media queries nativas activas
- Desktop estable desde SSR
- CLS reducido significativamente (~0.20 → ~0.05 estimado)
- Tablet y Mobile aún no cumplen completamente Fase 1

---

## ⚠️ Decisiones Importantes Tomadas

- ❌ No usar JavaScript para calcular layout
- ❌ No detectar viewport en runtime
- ❌ No reescribir componentes desde cero
- ✅ Usar CSS Grid para reservar espacio
- ✅ Sidebar y Header controlados por CSS
- ✅ Mantener estética dorada sin cambios

---

## 🛑 Cosas que NO se deben hacer

- No avanzar a Fase 2 sin cerrar Fase 1
- No introducir nuevas abstracciones
- No usar estilos inline para layout
- No romper diseño visual existente
- No aplicar parches solo para Desktop

---

## 📝 Pendientes Activos

- Cerrar Fase 1 en Tablet
- Cerrar Fase 1 en Mobile
- Validar CLS visual en los 3 breakpoints
- Confirmar ausencia de FOUC

---

## 📅 Historial de Cambios (resumido)

- 2026-02-03 — Fase 1 implementada parcialmente (Desktop estable)