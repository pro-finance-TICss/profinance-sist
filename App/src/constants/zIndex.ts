/**
 * Escala de Z-index centralizada para evitar conflictos de capas
 * Organizada por jerarquía visual
 */

export const Z_INDEX = {
    // Fondo y contenido base
    BACKGROUND: 0,
    CONTENT: 5,

    // Navegación y UI persistente
    HEADER: 50,
    MOBILE_MENU_BUTTON: 80,

    // Overlays y menús
    OVERLAY: 90,
    SIDEBAR: 100,
    DROPDOWN: 110,

    // Modales y elementos críticos
    MODAL: 1000,
    TOAST: 1100,
    TOOLTIP: 1200,
} as const;

export type ZIndexLayer = keyof typeof Z_INDEX;
