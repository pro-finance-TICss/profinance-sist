// ============================================================================
// DASHBOARD LAYOUT — SERVER COMPONENT (Fase 3)
// ============================================================================
// Responsabilidad: validar el rol del usuario ANTES de montar cualquier
// componente del dashboard (incluyendo el DashboardClientLayout).
//
// SUPER_ADMIN → redirect("/superadmin")  [HTTP 307, sin render]
// ADMIN       → redirect("/admin")       [HTTP 307, sin render]
// USER/SOCIO  → monta DashboardClientLayout normalmente
//
// auth() es la función de NextAuth v5 para Server Components.
// ============================================================================

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import DashboardClientLayout from "./DashboardClientLayout";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // TEMPORAL — diagnóstico: confirmar que role está disponible en auth()
  // Eliminar una vez verificado el redirect correcto.
  console.log("[DashboardLayout] session.user.role =", session?.user?.role ?? "NO SESSION");

  // Redirect server-side — antes de que CUALQUIER componente del dashboard
  // (incluyendo DashboardClientLayout) se monte en el cliente.
  if (session?.user?.role === "SUPER_ADMIN") {
    redirect("/superadmin");
  }

  if (session?.user?.role === "ADMIN") {
    redirect("/admin");
  }

  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}
