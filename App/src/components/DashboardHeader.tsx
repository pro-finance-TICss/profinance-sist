"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import styles from "./DashboardHeader.module.css";

/**
 * Props del componente DashboardHeader.
 */
interface DashboardHeaderProps {
  /** Título de la página actual */
  pageTitle: string;
}

/**
 * @component DashboardHeader
 * @description Header del dashboard con logo, título de página y menú de usuario.
 * Incluye opciones para cerrar sesión y modificar configuración.
 *
 * @example
 * ```tsx
 * <DashboardHeader pageTitle="Gestión de Fondos" />
 * ```
 */
export function DashboardHeader({ pageTitle }: DashboardHeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  /**
   * Maneja el cierre de sesión utilizando NextAuth.
   */
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  /**
   * Redirige a la página de ajustes.
   */
  const handleSettings = () => {
    // TODO: Crear página de ajustes
    alert("Función de ajustes en desarrollo");
    setMenuOpen(false);
  };

  return (
    <header className={styles.header}>
      {/* Logo y Nombre de la Empresa */}
      <div className={styles.brand}>
        <div className={styles.logoContainer}>
          <img
            src="/Background-recortado.png"
            alt="Pro-Finance Logo"
            className={styles.logo}
          />
        </div>
        <h1 className={styles.companyName}>PRO-FINANCE</h1>
      </div>

      {/* Título de la Página */}
      <h2 className={styles.pageTitle}>{pageTitle}</h2>

      {/* Menú de Usuario */}
      <div className={styles.userMenu}>
        <button
          className={styles.userButton}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menú de usuario"
          aria-expanded={menuOpen}
        >
          <span className={styles.userIcon}>👤</span>
        </button>

        {menuOpen && (
          <div className={styles.dropdown}>
            <button className={styles.dropdownItem} onClick={handleSettings}>
              ⚙️ Ajustes de Cuenta
            </button>
            <button className={styles.dropdownItem} onClick={handleLogout}>
              🚪 Cerrar Sesión
            </button>
          </div>
        )}
      </div>

      {/* Overlay para cerrar el menú al hacer click fuera */}
      {menuOpen && (
        <div className={styles.overlay} onClick={() => setMenuOpen(false)} />
      )}
    </header>
  );
}
