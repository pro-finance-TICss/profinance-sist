# ProFinance - Sistema de Gestión de Activos

## Descripción

ProFinance es una plataforma web avanzada para la gestión de activos financieros privados. Ofrece una interfaz moderna y segura para que los socios monitoreen sus inversiones, realicen transacciones y gestionen su seguridad. El sistema cuenta con autenticación robusta, roles de usuario, y funcionalidades en tiempo real.

## Características Principales

- **Seguridad Bancaria**: Autenticación 2FA (TOTP), códigos de recuperación, alertas de inicio de sesión y gestión de dispositivos de confianza.
- **Roles y Permisos**: Sistema de roles (Usuario, Admin, SuperAdmin) con control de acceso granular.
- **Gestión de Cartera**: Visualización de balance, historial de transacciones, depósitos y retiros.
- **Interfaz Moderna**: Diseño responsivo, modo oscuro y animaciones fluidas (framer-motion).
- **Backend Robusto**: Construido con Next.js 14, Prisma ORM y NextAuth v5.

## Tecnologías Utilizadas

- **Frontend**: React, Next.js 14 (App Router), TailwindCSS (opcional), CSS Modules.
- **Backend**: Next.js API Routes, Server Actions.
- **Base de Datos**: SQLite (Desarrollo) / PostgreSQL (Producción), gestionado con Prisma.
- **Autenticación**: NextAuth.js v5, JWT, Bcrypt.
- **Validación**: Zod.
- **Iconos**: Lucide React.

## Estructura del Proyecto (`src/`)

```
src/
├── app/                  # Rutas y páginas (Next.js App Router)
│   ├── api/              # Endpoints de API
│   ├── dashboard/        # Área privada del usuario
│   ├── login/            # Página de inicio de sesión
│   └── register/         # Página de registro
├── components/           # Componentes de React
│   ├── layout/           # Componentes estructurales (Header, Sidebar, Footer)
│   ├── ui/               # Componentes UI reutilizables (Botones, Inputs)
│   ├── dashboard/        # Componentes específicos del dashboard
│   └── security/         # Componentes de seguridad (2FA, Modales)
├── lib/                  # Lógica de negocio y utilidades
│   ├── actions/          # Server Actions
│   ├── validations/      # Esquemas de validación Zod
│   ├── auth.ts           # Configuración de NextAuth
│   └── prisma.ts         # Cliente de Prisma
└── types/                # Definiciones de tipos TypeScript
```

## Configuración e Instalación

1. **Clonar el repositorio**:

   ```bash
   git clone <url-del-repositorio>
   cd profinance-sist/App
   ```

2. **Instalar dependencias**:

   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   Crea un archivo `.env` basado en `.env.example`:

   ```env
   DATABASE_URL="file:./dev.db"
   AUTH_SECRET="tu-secreto-super-seguro"
   ```

4. **Inicializar base de datos**:

   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Crear usuario administrador (Script)**:

   ```bash
   node prisma/create_superadmin.js
   ```

6. **Ejecutar servidor de desarrollo**:
   ```bash
   npm run dev
   ```
   Accede a [http://localhost:3000](http://localhost:3000).

## Comandos Útiles

- `npm run dev`: Inicia el servidor de desarrollo.
- `npx prisma studio`: Abre una interfaz web para ver y editar la base de datos.
- `npx prisma db push`: Sincroniza el esquema de Prisma con la base de datos.

## Guía de Desarrollo

### Reorganización de Componentes

Los componentes se han reorganizado para mejorar la escalabilidad. Si creas un nuevo componente:

- Si es estructural (ej. menú), va en `components/layout`.
- Si es un widget genérico (ej. botón), va en `components/ui`.
- Si es específico de una vista, va en la carpeta correspondiente (ej. `components/dashboard`).
