# Landing Page - Pro-Finance

Este proyecto contiene la página de aterrizaje (landing page) para el sistema financiero Pro-Finance. Está construido con [Astro](https://astro.build/), utilizando HTML, CSS y JavaScript/TypeScript.

## Estructura del Proyecto

El proyecto sigue la estructura estándar de Astro:

- **src/**: Código fuente del proyecto.
  - **components/**: Componentes reutilizables de Astro.
    - `Header.astro`: Barra de navegación superior.
    - `Hero.astro`: Sección principal con mensaje de bienvenida y gráfica.
    - `Benefits.astro`: Carrusel de beneficios con desplazamiento automático.
    - `FAQ.astro`: Sección de preguntas frecuentes y formulario de contacto.
    - `Footer.astro`: Pie de página con enlaces y derechos de autor.
  - **layouts/**: Plantillas de diseño generales.
    - `Layout.astro`: Estructura HTML base (head, body) compartida por las páginas.
  - **pages/**: Rutas y páginas del sitio.
    - `index.astro`: Página principal que ensambla todos los componentes.
  - **styles/**: Archivos de estilos globales.
    - `global.css`: Variables CSS, fuentes, reinicios y estilos utilitarios.
- **public/**: Archivos estáticos servidos directamente (imágenes, fuentes, iconos).

## Ejecución del Proyecto

1.  Instalar dependencias:

    ```bash
    npm install
    ```

2.  Iniciar servidor de desarrollo:

    ```bash
    npm run dev
    ```

3.  Construir para producción:
    ```bash
    npm run build
    ```

## Notas de Diseño

- **Tipografía**: Se utilizan las fuentes "Faster Stroker" (para títulos) y "Candara" (para cuerpo), definidas en `global.css`.
- **Colores**: Paleta de colores negro y dorado, gestionada a través de variables CSS (`--color-gold-start`, `--color-dark-grey`, etc.).
