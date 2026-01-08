"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";

/**
 * Tipo para los items del menú de navegación.
 */
interface NavItem {
  /** Texto a mostrar en el enlace */
  label: string;
  /** Ruta del enlace */
  href: string;
  /** Icono emoji o símbolo visual */
  icon: string;
}

/**
 * Items de navegación del dashboard.
 */
const navItems: NavItem[] = [
  {
    label: "Fondos",
    href: "/dashboard/fondos",
    icon: "💰",
  },
  {
    label: "Contáctanos",
    href: "/dashboard/contactanos",
    icon: "💬",
  },
];

/**
 * @component Sidebar
 * @description Panel lateral de navegación del dashboard.
 * Muestra los enlaces principales y resalta la sección activa.
 * En desktop permanece visible, en mobile se puede colapsar.
 *
 * @example
 * ```tsx
 * <Sidebar />
 * ```
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      {/* Navigation Links */}
      <nav className={styles.nav}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${isActive ? styles.active : ""}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer optativo */}
      <div className={styles.footer}>
        <p className={styles.footerText}>© 2024 Pro-Finance</p>
      </div>
    </aside>
  );
}
