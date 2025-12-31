# Pro-Finance App (Sistema)

Aplicación Web Progresiva (PWA) para la gestión de inversiones y dashboard de usuarios. Desarrollada con **Next.js**.

## Funcionalidades Core

- 🔐 **Autenticación**: Login y Registro seguros con validación Zod.
- 📊 **Dashboard**: Visualización de métricas financieras (Próximamente).
- 🛡️ **Seguridad**: Sanitización de inputs y manejo de sesiones.

## Estructura del Proyecto

```text
src/
├── app/                # Rutas (App Router)
│   ├── login/          # Página de Inicio de Sesión
│   └── ...
├── components/         # Componentes de React
│   ├── ui/             # Componentes base (Input, Button)
│   └── SystemHeader.tsx
├── lib/
│   └── schemas.ts      # Esquemas de validación (Zod)
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

## Stack Tecnológico

- **Framework**: Next.js 15+ (App Router).
- **Lenguaje**: TypeScript.
- **Validación**: Zod.
- **Estilos**: CSS Modules / Global CSS.

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
