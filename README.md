# Pro-Finance

Proyectos de software para Pro-finance

## Estructura del Proyecto

El repositorio está dividido en dos aplicaciones principales:

1.  **Landing Page (`/Landing`)**: Sitio web público desarrollado con **Astro**. Enfocado en SEO, performance y presentación de marca.
2.  **Sistema (`/App`)**: Aplicación web progresiva (PWA) desarrollada con **Next.js**. Contiene el dashboard, autenticación y lógica de negocio.

## Requisitos Previos

- Node.js v18.17.0 o superior.
- npm v9 o superior.

## Instalación y Configuración

### 1. Landing Page

```bash
cd Landing
npm install
cp .env.example .env # (Si aplica)
```

**Ejecutar desarrollo:**

```bash
npm run dev
# Acceder en http://localhost:4321
```

### 2. Sistema (App)

```bash
cd App
npm install
cp .env.example .env
```

**Ejecutar desarrollo:**

```bash
npm run dev
# Acceder en http://localhost:3000
```

## Guía de Desarrollo

### Estándares de Código

- **Idioma**: Comentarios y documentación en **Español** (para el equipo). Código (variables, funciones) en **Inglés**.
- **Componentes**: Seguir principios SOLID. Extraer UI reutilizable a `src/components/ui`.
- **Seguridad**: Validar todos los inputs con Zod. Sanitizar renderizado.

### Estructura de Carpetas Clave

- `Landing/src/components/ui`: Componentes visuales genéricos (Botones, Títulos).
- `Landing/src/components/conocenos`: Secciones específicas de la página "Conócenos".
- `App/src/lib/schemas.ts`: Esquemas de validación Zod.
- `App/src/components/SystemHeader.tsx`: Header global del sistema.

## Contribución

1.  Crear rama desde `develop`: `git checkout -b feature/nombre-feature`.
2.  Realizar cambios siguiendo los estándares.
3.  Pull Request con descripción de cambios.
