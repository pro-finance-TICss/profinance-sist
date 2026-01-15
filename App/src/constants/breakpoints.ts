/**
 * Breakpoints centralizados para el Dashboard
 * Basados en estándares de la industria y optimizados para el diseño actual
 */

export const BREAKPOINTS = {
    mobile: '(max-width: 767px)',
    tablet: '(min-width: 768px) and (max-width: 1023px)',
    desktop: '(min-width: 1024px)',

    // Breakpoints numéricos para cálculos
    mobileMax: 767,
    tabletMin: 768,
    tabletMax: 1023,
    desktopMin: 1024,
} as const;

/**
 * Tipos para TypeScript
 */
export type Breakpoint = keyof typeof BREAKPOINTS;
export type DeviceType = 'mobile' | 'tablet' | 'desktop';
