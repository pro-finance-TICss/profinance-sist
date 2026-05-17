# Pro-Finance

Proyectos de software para Pro-finance. Este repositorio opera como un Monorepo utilizando npm workspaces.

## Estructura del Proyecto

El repositorio está dividido en dos aplicaciones principales:

1. **Landing Page (`/Landing`)**: Sitio web público desarrollado con Astro. Enfocado en SEO, performance y presentación de marca.
2. **Sistema (`/App`)**: Aplicación web progresiva (PWA) desarrollada con Next.js. Contiene el dashboard, autenticación y lógica de negocio.

## Requisitos Previos

- Node.js v18.17.0 o superior.
- npm v9 o superior.

## Instalación

Desde la carpeta raíz del proyecto:

```bash
# Instalar todas las dependencias (App y Landing)
npm install
```

## Ejecución

Puedes ejecutar los entornos de desarrollo directamente desde la raíz:

### Sistema (App)

```bash
npm run app:dev
# Acceder en http://localhost:3000
```

### Landing Page

```bash
npm run landing:dev
# Acceder en http://localhost:4321
```

## Configuración de Entorno

Asegúrate de configurar las variables de entorno para cada proyecto:

1. **App**: Copia `.env.example` a `App/.env` y ajusta según sea necesario.
2. **Landing**: Copia `.env.example` a `Landing/.env` (si aplica).

## Guía de Desarrollo

### Estándares de Código

- **Idioma**: Comentarios y documentación en Español (para el equipo). Código (variables, funciones) en Inglés.
- **Componentes**: Seguir principios de diseño modular. Extraer UI reutilizable a `src/components/ui`.
- **Seguridad**: Validar todos los inputs con Zod. Sanitizar renderizado.

### Estructura de Carpetas Clave

- `Landing/src/components/ui`: Componentes visuales genéricos (Botones, Títulos).
- `Landing/src/components/conocenos`: Secciones específicas de la página "Conócenos".
- `App/src/lib/schemas.ts`: Esquemas de validación Zod.
- `App/src/components/SystemHeader.tsx`: Header global del sistema.

## Contribución

1. Crear rama.
2. Realizar cambios siguiendo los estándares.
3. Pull Request con descripción de cambios.
