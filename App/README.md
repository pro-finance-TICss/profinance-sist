# ProFinance - Sistema de Gestión de Activos

## Descripción

ProFinance es una plataforma web avanzada para la gestión de activos financieros privados. Ofrece una interfaz moderna y segura para que los socios monitoreen sus inversiones, realicen transacciones y gestionen su seguridad. El sistema cuenta con autenticación robusta, roles de usuario, y funcionalidades en tiempo real.

## Características Principales

- **Seguridad Bancaria**: Autenticación 2FA (TOTP), códigos de recuperación, alertas de inicio de sesión y gestión de dispositivos de confianza.
- **Dashboard Completo**: Visualización de balance, historial de transacciones, rendimientos y notificaciones en tiempo real.
- **Billetera Digital**: Depósitos vía MercadoPago, retiros con aprobación administrativa, cuentas bancarias encriptadas (AES-256-GCM).
- **Sistema de Tickets**: Soporte integrado con máquina de estados (Abierto → En Progreso → Resuelto → Cerrado).
- **Panel de Administración**: Gestión de usuarios, aprobación de retiros, configuración global del sistema.
- **Panel de Super Administrador**: Analíticas de inversión, gestión de rendimientos, control total del sistema.
- **Roles de Usuario**: USER, SOCIO, ADMIN y SUPER_ADMIN con permisos granulares (RBAC).
- **Soporte Multi-Moneda**: Tasas de cambio en tiempo real (USD, COP, EUR, MXN, GBP).
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
│   ├── schema.prisma          # Modelo de datos (User, Transaction, etc.)
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
│   │   ├── verification/      # Verificación TOTP durante login
│   │   ├── dashboard/         # Dashboard principal del usuario
│   │   │   └── transacciones/ # Historial de transacciones y retiros
│   │   ├── admin/             # Panel de administración
│   │   ├── superadmin/        # Panel de super administrador (analíticas, rendimientos)
│   │   └── api/
│   │       ├── auth/          # Endpoints de autenticación (NextAuth, TOTP, device trust)
│   │       ├── wallet/        # Endpoints de billetera (balance, retiros, cuentas bancarias)
│   │       ├── mercadopago/   # Webhooks de MercadoPago (depósitos)
│   │       ├── exchange-rates/# Tasas de cambio en tiempo real
│   │       ├── user/          # Endpoints de usuario (moneda, sesiones)
│   │       ├── admin/         # Endpoints de administración
│   │       └── superadmin/    # Endpoints de super administrador
│   ├── components/
│   │   ├── ui/                # Componentes reutilizables (botones, inputs, modales)
│   │   ├── layout/            # Layout del dashboard (sidebar, header, footer)
│   │   ├── dashboard/         # Componentes del dashboard (balance, gráficos, tablas)
│   │   ├── auth/              # Componentes de autenticación (login form, TOTP input)
│   │   ├── security/          # Componentes de seguridad (AuthProvider, protección)
│   │   ├── admin/             # Componentes del panel admin
│   │   └── superadmin/        # Componentes del super admin (analíticas)
│   ├── lib/
│   │   ├── auth.ts            # Configuración central de NextAuth v5
│   │   ├── auth.config.ts     # Configuración edge-compatible de NextAuth
│   │   ├── prisma.ts          # Singleton de Prisma Client
│   │   ├── security.ts        # Utilidades RBAC, máquina de estados, auditoría
│   │   ├── totp.ts            # Utilidades TOTP (RFC 6238)
│   │   ├── trusted-device.ts  # Gestión de dispositivos de confianza
│   │   ├── schemas.ts         # Schemas de validación Zod (login, registro)
│   │   ├── config.ts          # Configuración dinámica del sistema
│   │   ├── enums.ts           # Enumeraciones y constantes del dominio
│   │   ├── actions/           # Server Actions
│   │   │   ├── admin.ts       # Acciones de administración (usuarios, tickets, retiros)
│   │   │   ├── notifications.ts # Gestión de notificaciones
│   │   │   ├── performance.ts # Gestión de rendimientos (USER/SOCIO)
│   │   │   ├── security-setup.ts # Flujo de configuración de seguridad
│   │   │   ├── superadmin-analytics.ts # Analíticas de inversión
│   │   │   ├── user-settings.ts # Perfil y cambio de contraseña
│   │   │   └── wallet-checks.ts # Verificaciones de ventana de retiros
│   │   ├── logic/
│   │   │   └── withdrawal-window.ts # Lógica de ventana de retiros (día 1-16)
│   │   ├── utils/
│   │   │   ├── currency.ts    # Formateo y parseo de moneda
│   │   │   └── encryption.ts  # Encriptación AES-256-GCM (cuentas bancarias)
│   │   ├── validations/
│   │   │   └── wallet.ts      # Schemas Zod para operaciones de billetera
│   │   └── data/
│   │       └── banks.ts       # Datos de bancos (Colombia, México)
│   ├── contexts/
│   │   ├── CurrencyContext.tsx # Contexto global de moneda y tasas de cambio
│   │   └── DashboardContext.tsx # Contexto del dashboard (responsive, sidebar)
│   ├── hooks/
│   │   ├── useMediaQuery.ts   # Hook de media queries y breakpoints
│   │   └── useSessionValidator.ts # Validación periódica de sesión
│   ├── constants/
│   │   ├── breakpoints.ts     # Breakpoints centralizados (mobile, tablet, desktop)
│   │   └── zIndex.ts          # Escala de z-index centralizada
│   ├── types/
│   │   └── next-auth.d.ts     # Tipos extendidos de NextAuth (sesión, JWT)
│   └── proxy.ts               # Middleware de protección de rutas
├── .env.example               # Plantilla de variables de entorno
├── .gitignore                 # Archivos excluidos del repositorio
├── next.config.ts             # Configuración de Next.js (headers de seguridad)
├── package.json               # Dependencias y scripts
└── tsconfig.json              # Configuración de TypeScript
```

## Seguridad Implementada

### Autenticación y Sesiones

- **NextAuth v5** con JWT firmados (HS256) y cookies HttpOnly/Secure/SameSite.
- **Sesión única** (Single Session Enforcement) usando `tokenVersion` que invalida tokens anteriores.
- **Gestión de sesiones activas** con revocación individual desde el dashboard.
- **Validación periódica** de sesión (cada 30 segundos + al recuperar foco de ventana).
- **Detección de dispositivos nuevos** con notificaciones automáticas al usuario.

### Autenticación de Dos Factores (2FA/TOTP)

- Basado en **RFC 6238** (TOTP), compatible con Google Authenticator y apps similares.
- **Códigos de recuperación** hasheados con bcrypt para acceso de emergencia.
- **Dispositivos de confianza** que omiten TOTP por 30 días (cookies seguras + token en BD).
- TOTP obligatorio para usuarios privilegiados (ADMIN/SUPER_ADMIN) y usuarios creados por script.

### Control de Acceso (RBAC)

- **4 roles jerárquicos**: USER → SOCIO → ADMIN → SUPER_ADMIN.
- Verificación de permisos en cada Server Action y ruta API.
- **Máquina de estados** para retiros y tickets con transiciones unidireccionales validadas.

### Protección de Datos

- **Encriptación AES-256-GCM** para números de cuenta bancaria (solo últimos 4 dígitos visibles).
- **bcryptjs** con factor de costo 12 para hashing de contraseñas.
- Variables de entorno para secretos (nunca hardcodeados).
- **Validación de firma HMAC** en webhooks de MercadoPago para prevenir falsificación.

### Headers de Seguridad HTTP

- `X-Content-Type-Options: nosniff` — Previene interpretación incorrecta de tipos MIME.
- `X-Frame-Options: DENY` — Previene ataques de clickjacking (iframe embedding).
- `X-XSS-Protection: 1; mode=block` — Activa filtro XSS del navegador.
- `Referrer-Policy: strict-origin-when-cross-origin` — Limita información de referencia.
- `Permissions-Policy` — Deshabilita APIs sensibles no necesarias (cámara, micrófono, geolocalización).
- `Cache-Control: no-store` — Previene almacenamiento de páginas protegidas (back button attack).

### Middleware de Protección de Rutas

- Rutas protegidas: `/dashboard`, `/admin`, `/superadmin`, `/setup-security`, `/settings`, `/profile`.
- Rutas de guest: `/login`, `/register` (redirige a dashboard si ya está autenticado).
- Rutas públicas: `/`, `/api`, `/conocenos`.
- Headers de seguridad aplicados a todas las respuestas.

### Auditoría

- Registro de acciones críticas (login, cambio de contraseña, operaciones financieras).
- Detección de dispositivos nuevos con alertas al usuario.
- Logs de consola con emojis descriptivos para depuración.

## Variables de Entorno

Copiar `.env.example` como `.env` y configurar los valores:

```bash
# Base de datos
DATABASE_URL="file:./dev.db"

# NextAuth.js (generar con: openssl rand -base64 32)
NEXTAUTH_SECRET="tu_secreto_seguro"
NEXTAUTH_URL="http://localhost:3000"

# MercadoPago
MERCADOPAGO_ACCESS_TOKEN="tu_access_token"
MERCADOPAGO_PUBLIC_KEY="tu_public_key"
MERCADOPAGO_WEBHOOK_SECRET="tu_webhook_secret"

# Encriptación (generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
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
# Editar .env con valores reales

# 3. Generar cliente Prisma y ejecutar migraciones
npx prisma generate
npx prisma migrate dev

# 4. (Opcional) Crear usuario super administrador
node prisma/create_superadmin.js

# 5. Iniciar servidor de desarrollo
npm run dev
```

## Scripts Disponibles

| Script          | Descripción                                |
| --------------- | ------------------------------------------ |
| `npm run dev`   | Inicia el servidor de desarrollo (webpack) |
| `npm run build` | Construye la aplicación para producción    |
| `npm run start` | Inicia el servidor de producción           |
| `npm run lint`  | Ejecuta ESLint para verificar código       |

## Scripts de Prisma

```bash
# Generar cliente de Prisma (después de cambios en schema)
npx prisma generate

# Crear y aplicar migraciones
npx prisma migrate dev

# Abrir Prisma Studio (interfaz visual de BD)
npx prisma studio

# Crear usuarios con roles específicos
node prisma/create_superadmin.js
node prisma/create_admin.js
node prisma/create_partner.js    # Crea usuario con rol SOCIO
node prisma/create_user.js
```

## Flujos Principales

### Flujo de Autenticación

1. Usuario ingresa credenciales → Validación con bcrypt.
2. Si tiene 2FA habilitado → Redirige a `/verification` para código TOTP.
3. Si el dispositivo es de confianza → Omite TOTP.
4. Si es un dispositivo nuevo → Registra en auditoría y notifica al usuario.
5. Si requiere setup de seguridad → Redirige a `/setup-security`.
6. Sesión creada con JWT extendido (id, role, tokenVersion, sessionId).

### Flujo de Retiros

1. Usuario solicita retiro (solo disponible del día 1 al 16 del mes).
2. Balance se descuenta inmediatamente (transacción atómica Prisma).
3. Solicitud queda en estado PENDING → REVIEWED → APPROVED → PAID.
4. Si es rechazada (REJECTED), el balance se reembolsa automáticamente.
5. Notificaciones enviadas en cada cambio de estado.

### Flujo de Depósitos (MercadoPago)

1. Usuario crea preferencia de pago desde el dashboard.
2. MercadoPago procesa el pago y envía webhook.
3. **Webhook valida firma HMAC** (X-Signature) contra secreto configurado.
4. Si el pago es aprobado, balance se actualiza y se registra transacción.
5. Idempotencia: pagos duplicados se ignoran (verificación por `paymentId`).

## Licencia

Proyecto privado. Todos los derechos reservados.
