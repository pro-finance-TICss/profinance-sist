// ============================================================================
// /select-account — REDIRECT SERVER-SIDE
// ============================================================================
// Esta página ya no forma parte del flujo de usuario.
// Redirige a cada rol a su destino correcto sin renderizar UI.
//
// FASE 5 — Cleanup de navegación legacy
// ============================================================================

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function SelectAccountPage() {
  const session = await auth();
  const role = session?.user?.role;

  if (role === "SUPER_ADMIN") {
    redirect("/superadmin");
  }

  if (role === "ADMIN") {
    redirect("/admin");
  }

  // USER, SOCIO y cualquier otro rol → dashboard
  redirect("/dashboard");
}
