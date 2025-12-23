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

## Seguridad

- Todos los formularios deben usar **Zod** para validar datos tanto en cliente como en servidor.
- No commitear nunca el archivo `.env`.
