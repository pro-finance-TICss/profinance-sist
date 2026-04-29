// ============================================================================
// /dashboard/cuentas/[accountId] — PÁGINA DE DETALLE DE CUENTA
// ============================================================================
// Server Component puro:
//   - Recibe params como Promise (Next.js 15)
//   - Delega toda la lógica de datos y UI a <AccountDetail />
//   - NO hace fetch, NO usa hooks de cliente
//
// FASE 4.2 — ACCOUNT DETAIL
// ============================================================================

import React from "react";
import { AccountDetail } from "@/components/dashboard/AccountDetail";

interface AccountDetailPageProps {
  params: Promise<{ accountId: string }>;
}

export const metadata = {
  title: "Detalle de Cuenta | Pro-Finance",
  description: "Información completa y movimientos de tu cuenta financiera.",
};

export default async function AccountDetailPage({ params }: AccountDetailPageProps) {
  // Next.js 15: params es una Promise — se awaita en el server
  const { accountId } = await params;

  return (
    <div
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "32px 20px 64px",
      }}
    >
      <AccountDetail accountId={accountId} />
    </div>
  );
}
