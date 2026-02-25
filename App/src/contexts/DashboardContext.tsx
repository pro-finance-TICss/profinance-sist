"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useBreakpoints } from "@/hooks/useMediaQuery";

interface DashboardContextValue {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isSidebarOpen: boolean;
    openSidebar: () => void;
    closeSidebar: () => void;
    toggleSidebar: () => void;
    // Cambiamos a boolean | null para que coincida con el estado real
    isCollapsed: boolean | null;
    collapseSidebar: () => void;
    expandSidebar: () => void;
    toggleCollapse: () => void;
}

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

interface DashboardProviderProps {
    children: React.ReactNode;
}

export function DashboardProvider({ children }: DashboardProviderProps) {
    const { isMobile, isTablet, isDesktop } = useBreakpoints();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Mantenemos tu lógica de hidratación con null
    const [isCollapsed, setIsCollapsed] = useState<boolean | null>(null);

    const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
    const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
    const toggleSidebar = useCallback(() => setIsSidebarOpen((prev) => !prev), []);

    const collapseSidebar = useCallback(() => setIsCollapsed(true), []);
    const expandSidebar = useCallback(() => setIsCollapsed(false), []);

    const toggleCollapse = useCallback(() => {
        setIsCollapsed((prev) => {
            const newState = !prev;
            localStorage.setItem("sidebar-collapsed", String(newState));

            // FASE 1 - Puente CSS↔JS: sincronizar la clase que gobierna el ancho en Tablet.
            // newState=true → colapsado → quitar clase de expansión
            // newState=false → expandido → añadir clase de expansión
            const root = window.document.documentElement;
            if (newState) {
                root.classList.remove('user-wants-tablet-expanded');
            } else {
                root.classList.add('user-wants-tablet-expanded');
            }

            return newState;
        });
    }, []);

    React.useLayoutEffect(() => {
        const root = window.document.documentElement;
        const saved = localStorage.getItem("sidebar-collapsed");

        root.classList.remove('user-wants-tablet-expanded');

        if (isTablet) {
            const wantsExpanded = saved === "false";
            setIsCollapsed(!wantsExpanded);
            if (wantsExpanded) {
                root.classList.add('user-wants-tablet-expanded');
            }
        } else if (isDesktop) {
            setIsCollapsed(false);
        } else {
            setIsCollapsed(false);
        }
    }, [isTablet, isDesktop]);

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
            isMobile, isTablet, isDesktop, isSidebarOpen,
            isCollapsed, openSidebar, closeSidebar,
            toggleSidebar, collapseSidebar, expandSidebar, toggleCollapse
        ]
    );

    return (
        <DashboardContext.Provider value={value}>
            {children}
        </DashboardContext.Provider>
    );
}

export function useDashboard() {
    const context = useContext(DashboardContext);

    if (context === undefined) {
        return {
            isMobile: false,
            isTablet: false,
            isDesktop: true,
            isSidebarOpen: false,
            openSidebar: () => {},
            closeSidebar: () => {},
            toggleSidebar: () => {},
            isCollapsed: false,
            collapseSidebar: () => {},
            expandSidebar: () => {},
            toggleCollapse: () => {},
        };
    }

    return context;
}
