"use client";
import React, { useState } from "react";
import { Sidebar } from "../ui/Sidebar";
import { DashboardHeader } from "../DashboardHeader";
import styles from "./DashboardLayout.module.css";

/**
 * Props del DashboardLayout.
 */
interface DashboardLayoutProps {
  /** Contenido de la página a mostrar */
  children: React.ReactNode;
  /** Título de la página actual para mostrar en el header */
  pageTitle: string;
}

/**
 * @component DashboardLayout
 * @description Layout principal del dashboard que integra Sidebar y Header.
 * Proporciona la estructura completa: sidebar + header + contenido principal.
 *
 * @example
 * ```tsx
 * <DashboardLayout pageTitle="Gestión de Fondos">
 *   <h1>Mi Página</h1>
 * </DashboardLayout>
 * ```
 */
export function DashboardLayout({ children, pageTitle }: DashboardLayoutProps) {
  const [activeItem, setActiveItem] = useState(pageTitle || "Inicio");

  return (
    <div className={styles.layout}>
      <Sidebar activeItem={activeItem} setActiveItem={setActiveItem} />
      <DashboardHeader pageTitle={pageTitle} />
      <main className={styles.mainContent}>{children}</main>
    </div>
  );
}
