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

    // Estado del menú móvil (drawer en móvil/tablet)
    isSidebarOpen: boolean;
    openSidebar: () => void;
    closeSidebar: () => void;
    toggleSidebar: () => void;

    // Estado de colapso del sidebar (solo para tablet/desktop)
    isCollapsed: boolean;
    collapseSidebar: () => void;
    expandSidebar: () => void;
    toggleCollapse: () => void;
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


    // Estado del sidebar drawer (solo relevante en móvil/tablet cuando actúa como drawer)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // MODIFICACIÓN QUIRÚRGICA: Iniciamos en false para evitar el error de hidratación
    const [isCollapsed, setIsCollapsed] = useState(false);


    // Handlers para el drawer (móvil/tablet) - MANTENIDOS IGUAL
    const openSidebar = useCallback(() => {
        setIsSidebarOpen(true);
    }, []);

    const closeSidebar = useCallback(() => {
        setIsSidebarOpen(false);
    }, []);

    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen((prev) => !prev);
    }, []);

    // Handlers para el colapso (tablet/desktop) - MANTENIDOS IGUAL
    const collapseSidebar = useCallback(() => {
        setIsCollapsed(true);
    }, []);

    const expandSidebar = useCallback(() => {
        setIsCollapsed(false);
    }, []);

    const toggleCollapse = () => {
        setIsCollapsed((prev) => {
            const newState = !prev;
            // Guardamos en el disco del navegador - MANTENIDO IGUAL
            localStorage.setItem("sidebar-collapsed", String(newState));
            return newState;
        });
    };

    // Cerrar automáticamente el drawer cuando se pasa a desktop - MANTENIDO IGUAL
    React.useEffect(() => {
        if (isDesktop) {
            setIsSidebarOpen(false);
        }
    }, [isDesktop]);

    // Ajustar el estado de colapso según el breakpoint - MANTENIDO IGUAL
    // Nota: Esta lógica del agente sobreescribe la persistencia si cambias de tamaño
    // Ajustar el estado de colapso según el breakpoint
    React.useEffect(() => {
        if (isTablet) {
            // En Tablet: Forzamos el colapso (80px) para ganar espacio
            setIsCollapsed(true);
            setIsSidebarOpen(false);
        } else if (isDesktop) {
            // En Desktop: Forzamos expansión SIEMPRE
            setIsCollapsed(false);
            setIsSidebarOpen(false);
        }
    }, [isTablet, isDesktop]);

    // Memoizar el valor del contexto para evitar re-renders - MANTENIDO IGUAL
    const value = useMemo(
        () => ({
            isMobile,
            isTablet,
            isDesktop,
            isSidebarOpen,
            openSidebar,
            closeSidebar,
            toggleSidebar,
            isCollapsed,
            collapseSidebar,
            expandSidebar,
            toggleCollapse,
        }),
        [
            isMobile,
            isTablet,
            isDesktop,
            isSidebarOpen,
            openSidebar,
            closeSidebar,
            toggleSidebar,
            isCollapsed,
            collapseSidebar,
            expandSidebar,
            toggleCollapse,
        ]
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
