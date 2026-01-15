"use client";

import React from "react";
import { DashboardProvider } from "@/contexts/DashboardContext";

/**
 * Client Wrapper para el Dashboard Layout
 * 
 * Este componente envuelve el contenido del dashboard con el DashboardProvider.
 * Es necesario porque el layout.tsx puede necesitar ser Server Component,
 * pero el Provider requiere 'use client'.
 * 
 * @param children - Contenido del dashboard (Sidebar, Header, Main)
 */
interface DashboardClientWrapperProps {
    children: React.ReactNode;
}

export function DashboardClientWrapper({ children }: DashboardClientWrapperProps) {
    return <DashboardProvider>{children}</DashboardProvider>;
}
