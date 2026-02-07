import type { ReactNode } from "react";

/**
 * Layout limpio para la pantalla de selección de cuenta
 * 
 * CARACTERÍSTICAS:
 * - NO incluye Sidebar ni Header (App Shell)
 * - Reutiliza el background decorativo del Root Layout
 * - Permite que la página use clases .auth-container y .auth-card
 * 
 * NOTA: Este layout es específico para /select-account
 * y garantiza que no herede el App Shell del dashboard
 */
export default function SelectAccountLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}
