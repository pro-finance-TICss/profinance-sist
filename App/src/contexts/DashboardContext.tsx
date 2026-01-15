"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useBreakpoints } from "@/hooks/useMediaQuery";

/**
 * Interfaz del contexto del Dashboard
 * Centraliza todos los estados relacionados con la UI del dashboard
 */
interface DashboardContextValue {
    // Estados de responsive
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;

    // Estado del menú móvil
    isSidebarOpen: boolean;
    openSidebar: () => void;
    closeSidebar: () => void;
    toggleSidebar: () => void;
}

/**
 * Contexto del Dashboard
 */
const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

/**
 * Props del Provider
 */
interface DashboardProviderProps {
    children: React.ReactNode;
}

/**
 * Provider del Dashboard Context
 * Debe envolver el layout del dashboard para proporcionar estado global
 * 
 * @example
 * <DashboardProvider>
 *   <DashboardLayout>
 *     {children}
 *   </DashboardLayout>
 * </DashboardProvider>
 */
export function DashboardProvider({ children }: DashboardProviderProps) {
    // Detectar breakpoints usando el hook personalizado
    const { isMobile, isTablet, isDesktop } = useBreakpoints();

    // Estado del sidebar (solo relevante en móvil/tablet)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Handlers memoizados para evitar re-renders innecesarios
    const openSidebar = useCallback(() => {
        setIsSidebarOpen(true);
    }, []);

    const closeSidebar = useCallback(() => {
        setIsSidebarOpen(false);
    }, []);

    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen((prev) => !prev);
    }, []);

    // Cerrar automáticamente el sidebar cuando se pasa a desktop
    React.useEffect(() => {
        if (isDesktop) {
            setIsSidebarOpen(false);
        }
    }, [isDesktop]);

    // Memoizar el valor del contexto para evitar re-renders
    const value = useMemo(
        () => ({
            isMobile,
            isTablet,
            isDesktop,
            isSidebarOpen,
            openSidebar,
            closeSidebar,
            toggleSidebar,
        }),
        [isMobile, isTablet, isDesktop, isSidebarOpen, openSidebar, closeSidebar, toggleSidebar]
    );

    return (
        <DashboardContext.Provider value={value}>
            {children}
        </DashboardContext.Provider>
    );
}

/**
 * Hook personalizado para consumir el DashboardContext
 * Incluye validación para asegurar que se use dentro del Provider
 * 
 * @throws Error si se usa fuera del DashboardProvider
 * 
 * @example
 * const { isMobile, toggleSidebar } = useDashboard();
 */
export function useDashboard() {
    const context = useContext(DashboardContext);

    if (context === undefined) {
        throw new Error(
            "useDashboard debe ser usado dentro de un DashboardProvider. " +
            "Asegúrate de envolver tu componente con <DashboardProvider>."
        );
    }

    return context;
}
