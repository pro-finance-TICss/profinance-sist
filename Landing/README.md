# Pro-Finance Landing Page

Plataforma pública de alto impacto visual para Pro-Finance, construida con **Astro**.

## Características Principales

- ⚡ **Rendimiento**: Generación de sitio estático (SSG) para máxima velocidad.
- 🎨 **Diseño**: Estilo "Dark Premium" con gradientes dorados y componentes animados.
- 🧩 **Modularidad**: Componentes reutilizables siguiendo principios SOLID.

## Estructura del Proyecto

```text
src/
├── components/
│   ├── index/          # Componentes principales de la Home (Hero, Benefits, FAQ, etc.)
│   ├── ui/             # Componentes reutilizables (Botones, Títulos, Cards)
│   ├── conocenos/      # Secciones específicas de la página "Conócenos"
│   └── ...             # Componentes adicionales
│
├── layouts/            # Plantilla base (HTML, Head)
├── pages/              # Rutas (index, conocenos)
└── styles/             # Variables CSS globales y fuentes
```

## Guía de Instalación y Uso

1.  **Instalar dependencias**:

    ```bash
    npm install
    ```

2.  **Iniciar servidor local**:

    ```bash
    npm run dev
    ```

    El sitio estará disponible en `http://localhost:4321`.

3.  **Construir para producción**:

    ```bash
    npm run build
    ```

## Stack Tecnológico

- **Framework**: Astro 5.0
- **Estilos**: CSS Nativo (Variables CSS, Scoped Styles).
- **Lenguaje**: TypeScript (en bloques de script).

## Estándares de Contribución

- Utilizar componentes UI de `src/components/ui` siempre que sea posible.
- Documentar nuevos componentes con **JSDoc** en Español.
- Mantener el idioma de las variables en Inglés.
