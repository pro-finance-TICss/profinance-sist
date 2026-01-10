# Pro-Finance App (Sistema)

Aplicación Web Progresiva (PWA) para la gestión de inversiones y dashboard de usuarios. Desarrollada con **Next.js**.

## Funcionalidades Principales

- 🔐 **Autenticación Robusta**: Login y Registro con validación Zod, autenticación de dos factores (2FA) y códigos de recuperación.
- 🎨 **Diseño Moderno**: Interfaz con Split-Screen layout para autenticación y Dashboard estilo SPA.
- 📊 **Dashboard Financiero**: Visualización de balance, estados de cuenta y gestión de retiros.
- 🛡️ **Seguridad Bancaria**: Sanitización de inputs, Bcrypt, manejo seguro de sesiones (Single Session Enforcement) y protección contra CSRF/XSS.
- 👑 **Roles y Permisos**: Sistema de roles (USER, ADMIN, SUPER_ADMIN) con portales dedicados.

## Estructura del Proyecto

```text
src/
├── app/                  # Rutas (App Router)
│   ├── admin/            # Portal de Administrador
│   ├── api/              # Endpoints de API (Wallet, Auth, etc.)
│   ├── dashboard/        # Dashboard de Usuario (Billetera, Perfil)
│   ├── login/            # Login (Diseño Split-Screen)
│   ├── register/         # Registro de Usuarios
│   ├── superadmin/       # Portal de Super Admin
│   └── verification/     # Página de Verificación (Legacy/Fallback)
├── components/           # Componentes de React
│   ├── auth/             # Componentes de Autenticación (Modales, Forms)
│   ├── dashboard/        # Componentes del Dashboard (Graficos, Tablas)
│   └── ui/               # Componentes atómicos (Card, Input, Button)
├── lib/
│   ├── actions/          # Server Actions
│   ├── validations/      # Esquemas Zod (Auth, Wallet)
│   ├── auth.ts           # Configuración principal de NextAuth
│   ├── prisma.ts         # Cliente de Prisma singleton
│   └── utils.ts          # Utilidades generales
├── prisma/
│   └── schema.prisma     # Modelado de base de datos
└── public/               # Assets estáticos
```

## Guía de Instalación y Uso

1.  **Instalar dependencias**:

    ```bash
    npm install
    ```

2.  **Configurar entorno**:
    Copiar el archivo de ejemplo y configurar las variables.

    ```bash
    cp .env.example .env
    ```

3.  **Iniciar servidor de desarrollo**:

    ```bash
    npm run dev
    ```

    La aplicación correrá en `http://localhost:3000`.

## Scripts Disponibles

- `npm run app:dev`: Servidor de desarrollo.
- `npm run app:build`: Compilar para producción.
- `npm run app:lint`: Verificar errores de estilo y código.

## 🏗️ Stack Tecnológico y Arquitectura

- **Framework**: Next.js 15+ (App Router).
- **Lenguaje**: TypeScript (Strict Mode).
- **ORM**: Prisma.
- **Base de Datos**: SQLite (Desarrollo) / Postgres (Producción).
- **Autenticación**: NextAuth.js v5.
- **Validación**: Zod.
- **Formularios**: React Hook Form.
- **Estilos**: CSS Modules + Variables CSS Globales.

## 🔐 Módulo de Autenticación y Seguridad

El sistema implementa un modelo de seguridad por capas:

1.  **Autenticación**:

    - Credenciales (Email/Password) con hashing seguro.
    - **2FA (Doble Factor)**: Integración con aplicaciones TOTP (Google Authenticator, Authy).
    - **Códigos de Recuperación**: Códigos de un solo uso para emergencias.

2.  **Manejo de Sesiones**:

    - **Single Session Enforcement**: Invalida sesiones anteriores al iniciar sesión nueva.
    - **Cookies Seguras**: HttpOnly, Secure, SameSite.
    - **Expiración Automática**: 30 minutos de inactividad.

3.  **Protección de Rutas**:
    - Middleware compatible con Edge para verificar tokens JWT.
    - Redirección inteligente basada en roles (Admin/User).

### Comandos Útiles de Prisma

```bash
# Ver la base de datos (GUI)
npx prisma studio

# Resetear base de datos (¡Precaución!)
npx prisma migrate reset
```
