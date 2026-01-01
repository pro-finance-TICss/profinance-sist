# Pro-Finance App (Sistema)

Aplicación Web Progresiva (PWA) para la gestión de inversiones y dashboard de usuarios. Desarrollada con **Next.js**.

## Funcionalidades Core

- 🔐 **Autenticación**: Login y Registro seguros con validación Zod.
- 🧪 **Diseño Experimental**: Nuevas rutas `/login2` y `/register2` con layout Split-Screen.
- 📊 **Dashboard**: Visualización de métricas financieras (Próximamente).
- 🛡️ **Seguridad**: Sanitización de inputs, Bcrypt para hashing y manejo de sesiones seguro.

## Estructura del Proyecto

```text
src/
├── app/                  # Rutas (App Router)
│   ├── login/            # Login v1 (Glassmorphism centrado)
│   ├── login2/           # [NUEVO] Login v2 (Split-Screen layout)
│   ├── register/         # Registro v1
│   ├── register2/        # [NUEVO] Registro v2
│   ├── dashboard/        # Área privada
│   ├── verification/     # Página 2FA
│   └── api/              # API Routes (NextAuth, etc)
├── components/           # Componentes de React
│   ├── ui/               # Componentes atómicos (Input, Button) - Reutilizables (DRY)
│   └── SystemHeader.tsx  # Header global
├── lib/
│   ├── actions/          # Server Actions (Lógica de negocio y DB)
│   ├── validations/      # Esquemas Zod (Auth, Users) - Single Source of Truth
│   ├── prisma.ts         # Instancia Singleton de Prisma
│   └── utils.ts          # Helpers generales
├── prisma/
│   └── schema.prisma     # Modelado de base de datos (SQLite/Postgres)
└── public/               # Assets estáticos (imágenes, fuentes)
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
- **ORM**: Prisma (Gestión de esquema y migraciones).
- **Base de Datos**: SQLite (Desarrollo) / Postgres (Producción).
- **Autenticación**: NextAuth.js v5 (Beta).
- **Validación**: Zod (Cliente y Servidor).
- **Formularios**: React Hook Form.
- **Estilos**: CSS Modules + Variables CSS Globales.

## 📐 Principios de Desarrollo

Este proyecto sigue buenas prácticas de ingeniería de software:

1.  **DRY (Don't Repeat Yourself)**: Reutilización de componentes UI (`Input`, `Button`) y lógica de validación (`auth.ts`).
2.  **KISS (Keep It Simple, Stupid)**: Estructura de carpetas intuitiva y Server Actions directas en lugar de APIs complejas innecesarias.
3.  **SOLID**: Responsabilidad única en componentes y separación de capas (UI vs Lógica de Negocio).
4.  **Clean Code**: Nombres de variables descriptivos y código autodocumentado.

## 🔐 Módulo de Autenticación

El sistema cuenta con un módulo de autenticación completo y seguro que incluye:

- **Login y Registro** con validación de datos (Zod)
- **Hashing de contraseñas** con bcrypt
- **Protección de rutas** mediante Middleware
- **Autenticación de Dos Factores (2FA)** mockeada para desarrollo

### Credenciales de Prueba (Desarrollo)

El sistema utiliza una base de datos local SQLite (`dev.db`). Puedes registrar un nuevo usuario en `/register`.

### Flujo de 2FA (Mockeado)

1. Al iniciar sesión, se genera un código de 6 dígitos.
2. Este código se imprime en la **consola del servidor** (terminal donde ejecutas `npm run dev`).
3. Copia el código e ingrésalo en la pantalla de verificación.

### Comandos Útiles

```bash
# Ver la base de datos (GUI)
npx prisma studio

# Resetear base de datos
npx prisma migrate reset
```

## 🛠️ Tecnologías

- **Next.js 14** (App Router)
- **Prisma ORM** (Base de datos)
- **NextAuth.js v5** (Autenticación)
- **Zod** (Validaciones)
- **React Hook Form** (Manejo de formularios)

## Seguridad

- Todos los formularios deben usar **Zod** para validar datos tanto en cliente como en servidor.
- No commitear nunca el archivo `.env`.
