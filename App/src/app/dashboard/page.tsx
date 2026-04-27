// ============================================================================
// DASHBOARD PAGE — SERVER COMPONENT (Fase 3)
// ============================================================================
// La guardia de roles vive en layout.tsx.
// Este archivo solo renderiza DashboardContent para USER y SOCIO.
// ADMIN y SUPER_ADMIN nunca llegan aquí (redirect en layout.tsx).
// ============================================================================

import { DashboardContent } from "./DashboardContent";

export default function DashboardPage() {
  return <DashboardContent />;
}
