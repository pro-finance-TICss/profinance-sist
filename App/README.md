# PRO-FINANCE System

> [!IMPORTANT]
>
> ## CONTROL DE CARACTERÍSTICAS (FEATURE FLAGS)
>
> Actualmente algunas funciones están deshabilitadas por defecto para controlar el acceso.
> Para reactivarlas, modifica las constantes `true`/`false` en los siguientes archivos:
>
> **1. Registro de Usuarios**
>
> - Archivo: `App/src/app/register/page.tsx`
> - Constante: `REGISTRATIONS_OPEN`
> - Estado actual: `false` (Muestra mensaje "Registro cerrado")
>
> **2. Depósitos en App** (cambiar en ambos archivos)
>
> - `App/src/components/dashboard/billetera/DepositModal.tsx` -> constante `DEPOSITS_ENABLED`
> - `App/src/components/dashboard/DepositForm.tsx` -> constante `DEPOSITS_ENABLED`
> - Estado actual: `false` (Muestra mensaje "Contactar administrador")

---

# ProFinance - Sistema de Gestión de Activos

## Descripción

ProFinance es una plataforma web avanzada para la gestión de activos financieros privados. Ofrece una interfaz moderna y segura para que los socios monitoreen sus inversiones, realicen transacciones y gestionen su seguridad. El sistema cuenta con autenticación robusta, roles de usuario, y funcionalidades en tiempo real.

## Características Principales

- **Seguridad Bancaria**: Autenticación 2FA (TOTP), códigos de recuperación, alertas de inicio de sesión y gestión de dispositivos de confianza.
- **Dashboard Completo**: Visualización de balance, historial de transacciones, rendimientos y notificaciones en tiempo real.
- **Billetera Digital**: Depósitos vía MercadoPago, retiros con aprobación administrativa, cuentas bancarias encriptadas (AES-256-GCM).
- **Sistema de Tickets**: Soporte integrado con máquina de estados (Abierto -> En Progreso -> Resuelto -> Cerrado).
- **Panel de Administración**: Gestión de usuarios, aprobación de retiros, configuración global del sistema.
- **Panel de Super Administrador**: Analíticas de inversión, gestión de rendimientos, control total del sistema.
- **Roles de Usuario**: USER, SOCIO, ADMIN y SUPER_ADMIN con permisos granulares (RBAC).
- **Multi-Cuenta ("Cajitas")**: Los usuarios pueden gestionar múltiples cuentas financieras con roles independientes.
- **Responsive Design**: Interfaz adaptable a móvil, tablet y escritorio con contexto de dashboard centralizado.

## Stack Tecnológico

| Tecnología           | Uso                                         |
| -------------------- | ------------------------------------------- |
| **Next.js 16**       | Framework fullstack (App Router, RSC)       |
| **TypeScript**       | Tipado estático en todo el proyecto         |
| **Prisma 5**         | ORM con SQLite (desarrollo) / PostgreSQL    |
| **NextAuth v5 Beta** | Autenticación (JWT, Credentials, TOTP)      |
| **Zod**              | Validación de schemas en cliente y servidor |
| **bcryptjs**         | Hashing de contraseñas (factor 12)          |
| **otplib**           | Generación y verificación de tokens TOTP    |
| **MercadoPago SDK**  | Integración de pagos (depósitos)            |
| **Lucide React**     | Iconografía del sistema                     |
| **React Hook Form**  | Manejo de formularios con validación        |
| **CSS Modules**      | Estilos encapsulados por componente         |

## Estructura del Proyecto

```
App/
├── prisma/
│   ├── schema.prisma          # Modelo de datos (User, Account, Transaction, etc.)
│   ├── migrations/            # Migraciones de base de datos
│   ├── create_admin.js        # Script: crear usuario administrador
│   ├── create_partner.js      # Script: crear usuario socio
│   ├── create_superadmin.js   # Script: crear super administrador
│   └── seed.ts                # Semilla de datos iniciales
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout con AuthProvider
│   │   ├── globals.css        # Estilos globales del sistema
│   │   ├── login/             # Página de inicio de sesión
│   │   ├── register/          # Página de registro
│   │   ├── forgot-password/   # Recuperación de contraseña
│   │   ├── setup-security/    # Configuración inicial de seguridad (2FA + cambio de contraseña)
│   │   ├── select-account/    # Selección de cajita (multi-cuenta)
│   │   ├── dashboard/         # Dashboard principal del usuario
│   │   │   ├── billetera/     # Billetera digital (depósitos, cuentas bancarias)
│   │   │   ├── transacciones/ # Historial de transacciones y solicitudes de retiro
│   │   │   ├── inversiones/   # Vista de inversiones
│   │   │   ├── soporte/       # Sistema de tickets de soporte
│   │   │   ├── ajustes/       # Configuración del usuario y dispositivos
│   │   │   ├── seguridad/     # Configuración de seguridad (2FA, contraseña)
│   │   │   └── productos/     # Catálogo de productos
│   │   ├── admin/             # Panel de administración
│   │   │   ├── users/         # Gestión de usuarios
│   │   │   └── tickets/       # Gestión de tickets
│   │   ├── superadmin/        # Panel de super administrador (analíticas)
│   │   └── api/
│   │       ├── auth/          # Endpoints de autenticación
│   │       ├── wallet/        # Endpoints de billetera
│   │       ├── mercadopago/   # Webhooks de MercadoPago (depósitos)
│   │       ├── exchange-rates/# Tasas de cambio en tiempo real
│   │       ├── accounts/      # CRUD de cuentas financieras (cajitas)
│   │       ├── user/          # Endpoints de usuario (moneda, sesiones)
│   │       ├── admin/         # Endpoints de administración
│   │       └── superadmin/    # Endpoints de super administrador
│   ├── components/
│   │   ├── ui/                # Componentes reutilizables
│   │   ├── layout/            # Layout del dashboard
│   │   ├── dashboard/         # Componentes del dashboard
│   │   ├── auth/              # Componentes de autenticación
│   │   ├── security/          # Componentes de seguridad
│   │   ├── admin/             # Componentes del panel admin
│   │   └── superadmin/        # Componentes del super admin
│   ├── lib/
│   │   ├── auth.ts            # Configuración central de NextAuth v5
│   │   ├── auth.config.ts     # Configuración edge-compatible de NextAuth
│   │   ├── prisma.ts          # Singleton de Prisma Client
│   │   ├── security.ts        # Utilidades RBAC, máquina de estados, auditoría
│   │   ├── totp.ts            # Utilidades TOTP (RFC 6238)
│   │   ├── trusted-device.ts  # Gestión de dispositivos de confianza
│   │   ├── config.ts          # Configuración dinámica del sistema
│   │   ├── enums.ts           # Enumeraciones y constantes del dominio
│   │   ├── actions/           # Server Actions
│   │   ├── logic/             # Lógica de dominio y reglas de negocio
│   │   ├── utils/             # Utilidades varias (moneda, encriptación)
│   │   ├── validations/       # Schemas Zod
│   │   └── data/              # Datos estáticos (bancos, etc.)
│   ├── contexts/              # Contextos globales de React
│   ├── hooks/                 # Hooks personalizados
│   ├── constants/             # Constantes globales
│   ├── types/                 # Tipos TypeScript compartidos
│   └── proxy.ts               # Middleware de protección de rutas
├── .env.example               # Plantilla de variables de entorno
├── .gitignore                 # Archivos excluidos del repositorio
├── next.config.ts             # Configuración de Next.js
├── package.json               # Dependencias y scripts
└── tsconfig.json              # Configuración de TypeScript
```

## Seguridad Implementada

### Autenticación y Sesiones

- **NextAuth v5** con JWT firmados (HS256) y cookies HttpOnly/Secure/SameSite.
- **Sesión única** (Single Session Enforcement) usando `tokenVersion` que invalida tokens anteriores.
- **Gestión de sesiones activas** con revocación individual desde el dashboard.
- **Validación periódica** de sesión (cada 30 segundos y al recuperar foco de ventana).
- **Detección de dispositivos nuevos** con notificaciones automáticas al usuario.
- **Inactividad**: Modal de advertencia y cierre automático de sesión por inactividad (30 minutos).

### Autenticación de Dos Factores (2FA/TOTP)

- Basado en **RFC 6238** (TOTP), compatible con apps de autenticación estándar.
- **Códigos de recuperación** hasheados con bcrypt para acceso de emergencia.
- **Dispositivos de confianza** que omiten TOTP por 30 días.
- TOTP obligatorio para usuarios privilegiados y creados por script.

### Control de Acceso (RBAC)

- **4 roles jerárquicos**: USER, SOCIO, ADMIN, SUPER_ADMIN.
- Verificación de permisos en cada Server Action y ruta API.
- **Máquina de estados** para retiros y tickets con transiciones validadas.

### Protección de Datos

- **Encriptación AES-256-GCM** para números de cuenta bancaria.
- **bcryptjs** con factor de costo 12 para hashing de contraseñas.
- Variables de entorno para secretos.
- **Validación de firma HMAC** en webhooks de MercadoPago para prevenir falsificación.
- **Validación de inputs** con Zod en cliente y servidor.

### Headers de Seguridad HTTP

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` restrictiva.
- `Cache-Control: no-store` en rutas protegidas.

### Middleware de Protección de Rutas

- Rutas protegidas: `/dashboard`, `/admin`, `/superadmin`, `/setup-security`, `/settings`, `/profile`.
- Rutas de guest: `/login`, `/register`.
- Rutas públicas: `/`, `/api`, `/conocenos`.
- Headers de seguridad aplicados a todas las respuestas.

### Auditoría

- Registro de acciones críticas (login, cambio de contraseña, operaciones financieras).
- Detección de dispositivos nuevos con alertas al usuario.
- Logs de consola estructurados para depuración (solo entorno de desarrollo).

## Variables de Entorno

Copiar `.env.example` como `.env` y configurar los valores:

```bash
# Base de datos
DATABASE_URL="file:./dev.db"

# NextAuth.js
NEXTAUTH_SECRET="tu_secreto_seguro"
NEXTAUTH_URL="http://localhost:3000"

# API URL
NEXT_PUBLIC_API_URL="http://localhost:3000/api"

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN="tu_access_token"
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY="tu_public_key"
MERCADOPAGO_WEBHOOK_SECRET="tu_webhook_secret"

# Encriptación AES-256
ENCRYPTION_KEY="tu_clave_de_64_caracteres_hex"

# Notificaciones
FINANCE_DEPARTMENT_EMAIL="finance@profinance.com"
```

## Instalación y Desarrollo

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Generar cliente Prisma y ejecutar migraciones
npx prisma generate
npx prisma migrate dev

# 4. Iniciar servidor de desarrollo
npm run dev
```

## Scripts de Prisma

```bash
# Generar cliente de Prisma
npx prisma generate

# Crear y aplicar migraciones
npx prisma migrate dev

# Abrir Prisma Studio
npx prisma studio

# Crear usuarios
node prisma/create_superadmin.js
node prisma/create_admin.js
node prisma/create_partner.js
node prisma/create_user.js
```

## Flujos Principales

### Flujo de Autenticación

1. Usuario ingresa credenciales, validación con bcrypt.
2. Solicitud de código TOTP si está habilitado.
3. Omisión de TOTP si el dispositivo es de confianza.
4. Registro en auditoría y notificación si es un dispositivo nuevo.
5. Redirección a configuración de seguridad si es requerido.
6. Creación de sesión con JWT extendido.

### Flujo de Retiros

1. Usuario solicita retiro en el periodo habilitado.
2. Balance descontado inmediatamente.
3. Solicitud transiciona por estados: PENDING -> REVIEWED -> APPROVED -> PAID.
4. Reembolso automático si es rechazada.
5. Notificaciones enviadas en cambios de estado.

### Flujo de Depósitos (MercadoPago)

1. Usuario crea preferencia de pago.
2. MercadoPago procesa y envía webhook.
3. Validación de firma HMAC del webhook.
4. Actualización de balance y registro de transacción si es aprobado.
5. Control de idempotencia.

### Multi-Cuenta (Cajitas)

1. Múltiples cuentas financieras por usuario con roles independientes.
2. Selección de cuenta persistida en localStorage.
3. Adaptación de dashboard y rendimientos según el rol de la cuenta.
4. Redirección para selección de cuenta si no hay una activa.

## Licencia

Proyecto privado. Todos los derechos reservados.
