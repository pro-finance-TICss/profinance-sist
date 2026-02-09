"use client";

import { useState, useEffect } from "react";

/**
 * Hook personalizado para detectar media queries de forma eficiente
 * 
 * @param query - Media query string (ej: '(max-width: 768px)')
 * @returns boolean - true si la media query coincide
 * 
 * @example
 * const isMobile = useMediaQuery('(max-width: 767px)');
 * const isDesktop = useMediaQuery('(min-width: 1024px)');
 */
export function useMediaQuery(query: string): boolean {
    // Estado inicial: false para evitar hydration mismatch
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        // Crear el objeto MediaQueryList
        const mediaQuery = window.matchMedia(query);

        // Establecer el estado inicial
        setMatches(mediaQuery.matches);

        // Handler para cambios en la media query
        const handleChange = (event: MediaQueryListEvent) => {
            setMatches(event.matches);
        };

        // Suscribirse a cambios
        // Usar addEventListener para mejor compatibilidad
        mediaQuery.addEventListener("change", handleChange);

        // Cleanup: remover el listener al desmontar
        return () => {
            mediaQuery.removeEventListener("change", handleChange);
        };
    }, [query]);

    return matches;
}

/**
 * Hook de conveniencia para detectar múltiples breakpoints
 * Retorna un objeto con flags para cada tipo de dispositivo
 * 
 * @returns Object con flags isMobile, isTablet, isDesktop
 * 
 * @example
 * const { isMobile, isTablet, isDesktop } = useBreakpoints();
 */
export function useBreakpoints() {
    const isMobile = useMediaQuery("(max-width: 767px)");
    const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
    const isDesktop = useMediaQuery("(min-width: 1024px)");

    return {
        isMobile,
        isTablet,
        isDesktop,
    };
}
