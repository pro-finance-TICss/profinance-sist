# Walkthrough: Cajitas, Roles por Cuenta y Routing — 2026-02-14

> Resumen completo de los cambios realizados en esta sesión de desarrollo.

---

## 📋 Índice

1. [Headers individuales por página del Dashboard](#1-headers-individuales-por-página-del-dashboard)
2. [Redirección por rol tras login (SuperAdmin → /superadmin)](#2-redirección-por-rol-tras-login)
3. [Botón "Cambiar Cajita" en el Sidebar](#3-botón-cambiar-cajita-en-el-sidebar)
4. [Nombre de cajita visible en el Header](#4-nombre-de-cajita-visible-en-el-header)
5. [Gestión de roles por cajita en SuperAdmin](#5-gestión-de-roles-por-cajita-en-superadmin)
6. [Rol de la cajita activa en el Dashboard](#6-rol-de-la-cajita-activa-en-el-dashboard)

---

## 1. Headers individuales por página del Dashboard

### Problema

El layout del dashboard (`src/app/dashboard/layout.tsx`) tenía un header genérico que intentaba mostrar títulos condicionalmente según la ruta. Algunas páginas ya tenían su propio `PageHeader`, generando duplicación.

### Cambios

| Archivo                                    | Cambio                                                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/dashboard/layout.tsx`             | Eliminado el bloque genérico de header (líneas 89-98)                                                                          |
| `src/app/dashboard/ajustes/page.tsx`       | Agregado `<PageHeader title="Ajustes" subtitle="Gestiona tu perfil y preferencias." />`                                        |
| `src/app/dashboard/inversiones/page.tsx`   | Agregado `<PageHeader title="Inversiones" subtitle="Portafolio de Inversiones (En desarrollo)." />` + fix de `</div>` faltante |
| `src/app/dashboard/transacciones/page.tsx` | Agregado `<PageHeader>` + limpieza de imports desordenados                                                                     |
| `src/app/dashboard/productos/page.tsx`     | Sin cambio: `ProductsView` ya incluye su propio `PageHeader`                                                                   |
| `src/app/dashboard/soporte/page.tsx`       | Sin cambio: `TicketsView` ya incluye su propio `PageHeader`                                                                    |

---

## 2. Redirección por rol tras login

### Problema

Tras el login, todos los usuarios eran redirigidos a `/select-account` → `/dashboard`, sin importar su rol. Los SuperAdmin y Admin terminaban en el dashboard de usuario en vez de sus paneles dedicados.

### Causa raíz

`src/app/select-account/page.tsx` tenía hardcodeado `router.replace("/dashboard")` en todos los flujos (guard, auto-selección, selección manual, creación de cuenta).

### Cambios

**`src/app/select-account/page.tsx`:**

- Agregado `useSession` para obtener el rol del usuario
- Creada función `getRedirectPath()` que retorna:
  - `"/superadmin"` para `SUPER_ADMIN`
  - `"/admin"` para `ADMIN`
  - `"/dashboard"` para `USER` / `SOCIO`
- Reemplazados **todos** los `router.replace("/dashboard")` por `router.replace(getRedirectPath())`

### Rutas de redirección afectadas

- ✅ Guard (cuenta ya activa)
- ✅ Auto-selección (1 sola cuenta)
- ✅ Selección manual de cuenta
- ✅ Creación de nueva cuenta

---

## 3. Botón "Cambiar Cajita" en el Sidebar

### Funcionalidad

Nueva opción en el sidebar del dashboard que permite al usuario cambiar de cajita sin cerrar sesión.

### Cambios

**`src/components/layout/Sidebar.tsx`:**

- Agregado import de `ArrowLeftRight` (lucide), `useRouter`, `useAccount`
- Reducido `marginTop` del logo de `35px` → `5px` y `marginBottom` de `40px` → `15px`
- Agregado botón "Cambiar Cajita" justo arriba de "Cerrar Sesión"
  - Ícono: `↔` dorado con borde sutil
  - Hover: fondo dorado translúcido
  - Compatible con modo colapsado (solo ícono + tooltip)
  - Acción: `window.location.href = "/select-account?switch=true"`

### ¿Por qué `window.location.href` y no `router.push`?

**Race condition:** Al llamar `clearActiveAccount()`, el layout del dashboard detecta `!activeAccount` e inmediatamente **desmonta** el sidebar (mostrando spinner). Esto mata cualquier navegación pendiente de React Router. `window.location.href` opera a nivel del navegador y no depende del ciclo de vida de React.

**`src/app/select-account/page.tsx`:**

- Agregado `useSearchParams` para detectar `?switch=true`
- Cuando `switch=true`:
  - Ejecuta `clearActiveAccount()` al montar
  - **Desactiva** la auto-selección (no redirige si hay 1 sola cuenta)
  - **Desactiva** el guard (no redirige si ya hay cuenta activa)
- Sin `switch=true`: comportamiento original preservado (flujo de login)

---

## 4. Nombre de cajita visible en el Header

### Funcionalidad

El header del dashboard ahora muestra el nombre de la cajita activa junto al rol:

```
User Prueba Prueba
SOCIO | Cajita 2
```

### Cambios

**`src/components/layout/DashboardHeader.tsx`:**

- Agregado import de `useAccount` desde `@/contexts/AccountContext`
- Obtenido `activeAccount` del contexto
- El texto del rol ahora incluye: `{roleDisplay}{accountName ? ` | ${accountName}` : ""}`

---

## 5. Gestión de roles por cajita en SuperAdmin

### Problema

El panel de SuperAdmin solo permitía cambiar el rol **global del usuario** (USER ↔ SOCIO). No mostraba las cajitas individuales ni permitía cambiar el rol de una cajita específica.

### Diseño anterior

```
toggleUserSocioRole(userId) → cambia User.role (afecta TODAS las cajitas)
```

### Diseño nuevo

```
toggleAccountRole(accountId) → cambia Account.role (solo UNA cajita)
```

### Cambios

**Backend — `src/lib/actions/admin.ts`:**

1. **`getUsers()`** actualizado:
   - Ahora incluye `accounts` en el `select` de Prisma
   - Cada cuenta incluye: `id`, `name`, `role`, `investedCapital`, `createdAt`

2. **`toggleAccountRole(accountId)`** — función nueva:
   - Requiere rol `SUPER_ADMIN`
   - Busca la cuenta por ID
   - Alterna `Account.role` entre `"USER"` ↔ `"SOCIO"`
   - Registra en audit log (`ACCOUNT_ROLE_TOGGLED`)
   - Revalida rutas relevantes

3. **`toggleUserSocioRole(userId)`** — mantenido para compatibilidad

**Frontend — `src/app/superadmin/users/page.tsx`:**

- Rediseño completo de la tabla de usuarios
- **Filas expandibles**: click en un usuario muestra sus cajitas (▶ / ▼)
- **Columna "Cajitas"**: muestra cantidad de cajitas por usuario
- **Sub-filas por cajita**:
  - 📦 Nombre de la cajita
  - Capital invertido formateado
  - Badge de rol actual (USER / SOCIO con colores)
  - Botón individual "Cambiar a SOCIO" / "Cambiar a USER"
  - Fecha de creación
- Si un usuario no tiene cajitas, se muestra mensaje informativo

---

## 6. Rol de la cajita activa en el Dashboard

### Problema

Tras cambiar una cajita a SOCIO desde el SuperAdmin, el dashboard seguía mostrando:

- Header: "USUARIO" (en vez de "SOCIO")
- Tabla de rendimientos: registros de USER (en vez de SOCIO)

### Causa raíz

Todo usaba `session.user.role` (rol global del usuario) en vez de `activeAccount.role` (rol de la cajita).

### Cambios

**`src/components/layout/DashboardHeader.tsx`:**

```tsx
// ANTES:
const userRole = session?.user?.role || "USER";
const roleDisplay = getRoleDisplay(userRole);

// DESPUÉS:
const globalRole = session?.user?.role || "USER";
const displayRole = activeAccount?.role || globalRole;
const roleDisplay = getRoleDisplay(displayRole);
```

**`src/lib/actions/performance.ts`:**

```tsx
// ANTES:
export async function getDashboardPerformances() {
  const role = session.user.role; // ← Siempre "USER" para usuarios normales
  if (role === UserRole.SOCIO) targetRole = "SOCIO";
}

// DESPUÉS:
export async function getDashboardPerformances(accountRole?: string) {
  if (
    accountRole === "SOCIO" ||
    (!accountRole && session.user.role === UserRole.SOCIO)
  ) {
    targetRole = "SOCIO";
  }
}
```

**`src/components/dashboard/PerformanceTable.tsx`:**

- Agregado import de `useAccount`
- Obtiene `activeAccount.role` y lo pasa a `getDashboardPerformances(accountRole)`
- Se re-ejecuta cuando cambia `activeAccount` (cambio de cajita)

---

## 🗂️ Archivos modificados (resumen)

| Archivo                                         | Tipo de cambio                                |
| ----------------------------------------------- | --------------------------------------------- |
| `src/app/dashboard/layout.tsx`                  | Eliminado header genérico                     |
| `src/app/dashboard/ajustes/page.tsx`            | Agregado PageHeader                           |
| `src/app/dashboard/inversiones/page.tsx`        | Agregado PageHeader + fix JSX                 |
| `src/app/dashboard/transacciones/page.tsx`      | Agregado PageHeader + limpieza imports        |
| `src/app/select-account/page.tsx`               | Redirección por rol + mode switch             |
| `src/components/layout/Sidebar.tsx`             | Botón "Cambiar Cajita" + logo subido          |
| `src/components/layout/DashboardHeader.tsx`     | Rol de cajita + nombre de cajita              |
| `src/lib/actions/admin.ts`                      | getUsers con accounts + toggleAccountRole     |
| `src/app/superadmin/users/page.tsx`             | Tabla expandible de cajitas                   |
| `src/lib/actions/performance.ts`                | accountRole param en getDashboardPerformances |
| `src/components/dashboard/PerformanceTable.tsx` | Usa rol de cajita activa                      |

---

## ⚠️ Errores de lint pendientes (preexistentes)

Los siguientes errores existen en `src/app/api/accounts/route.ts` y son **anteriores a esta sesión**:

- `Property 'account' does not exist on type 'PrismaClient'` (líneas 42, 120, 132, 147)
- `Parameter 'acc' implicitly has an 'any' type` (línea 57)

Estos requieren regenerar el Prisma Client o ajustar el schema. No están relacionados con los cambios de esta sesión.
