"use client";

// ============================================================================
// DASHBOARD CONTENT — CLIENT COMPONENT
// ============================================================================
// Contiene toda la lógica interactiva del dashboard financiero.
// Solo se monta si page.tsx (Server Component) ya validó que el rol
// es USER o SOCIO. ADMIN y SUPER_ADMIN nunca llegan aquí.
// ============================================================================

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";

import { useDashboard } from "@/contexts/DashboardContext";
import { useAccount } from "@/contexts/AccountContext";
import { CajitasGrid } from "@/components/dashboard/CajitasGrid";
import { ActivitySection } from "@/components/dashboard/ActivitySection";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { ActionModal } from "@/components/dashboard/ActionModal";
import { DepositForm } from "@/components/dashboard/DepositForm";
import { PerformanceTable } from "@/components/dashboard/PerformanceTable";
import { WithdrawModal } from "@/components/dashboard/billetera/WithdrawModal";
import { InternalTransferModal } from "@/components/dashboard/billetera/InternalTransferModal";
import { checkWithdrawalWindowStatus } from "@/lib/actions/wallet-checks";
import { logger } from "@/lib/logger";

export function DashboardContent() {
  const { isMobile } = useDashboard();
  const { activeAccount } = useAccount();

  // --- ESTADOS PARA MODALES Y LOGICA DE NEGOCIO ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({ title: "", type: "" });
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isInternalTransferOpen, setIsInternalTransferOpen] = useState(false);
  const [internalTransferDirection, setInternalTransferDirection] = useState<
    "TO_INVESTMENT" | "TO_SAVINGS"
  >("TO_INVESTMENT");
  const [balance, setBalance] = useState(0);
  const [withdrawalWindow, setWithdrawalWindow] = useState<{
    isOpen: boolean;
    reason?: string;
  }>({ isOpen: true });

  // Verificar estado de ventana de retiros
  useEffect(() => {
    const checkStatus = async () => {
      const status = await checkWithdrawalWindowStatus();
      setWithdrawalWindow(status);
    };
    checkStatus();
  }, []);

  // Sincronizar balance local con la cuenta activa (usado por modales)
  useEffect(() => {
    if (!activeAccount) return;
    const fetchBalance = async () => {
      try {
        const res = await fetch(
          `/api/wallet/balance?accountId=${activeAccount.id}`
        );
        if (res.ok) {
          const data = await res.json();
          setBalance(data.balance?.investedCapital || 0);
        }
      } catch (error) {
        logger.error("Error cargando balance:", error);
      }
    };
    fetchBalance();
  }, [activeAccount]);

  const handleOpenModal = (title: string, type: string) => {
    const isInvestment = activeAccount?.type === "INVESTMENT";
    if (type === "withdraw") {
      if (isInvestment) {
        setInternalTransferDirection("TO_SAVINGS");
        setIsInternalTransferOpen(true);
      } else if (withdrawalWindow.isOpen) {
        setIsWithdrawModalOpen(true);
      }
    } else if (type === "deposit") {
      if (isInvestment) {
        setInternalTransferDirection("TO_INVESTMENT");
        setIsInternalTransferOpen(true);
      } else {
        setModalConfig({ title, type });
        setIsModalOpen(true);
      }
    } else {
      setModalConfig({ title, type });
      setIsModalOpen(true);
    }
  };

  const handleWithdrawSuccess = async () => {
    if (!activeAccount) return;
    try {
      const res = await fetch(
        `/api/wallet/balance?accountId=${activeAccount.id}`
      );
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance?.investedCapital || 0);
      }
    } catch (error) {
      logger.error("Error recargando balance:", error);
    }
  };

  return (
    <>
      <PageHeader
        title="Resumen Financiero"
        subtitle="Monitorea tus activos y actividad en tiempo real."
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "28px",
        }}
      >
        {/* 1. KPIs consolidados — datos desde AccountContext */}
        <SummaryCards />

        {/* 2. Cajitas — visión multi-cuenta */}
        <CajitasGrid />

        {/* 3. Actividad reciente + Acciones rápidas */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr auto",
            gap: "24px",
            alignItems: "start",
          }}
        >
          <ActivitySection />
          <QuickActions
            onActionClick={handleOpenModal}
            withdrawalWindow={withdrawalWindow}
            isInvestment={activeAccount?.type === "INVESTMENT"}
          />
        </div>

        {/* 4. Tabla de rendimiento */}
        <PerformanceTable />
      </div>

      {/* ── MODALES (sin cambios) ── */}
      <ActionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalConfig.title}
      >
        {modalConfig.type === "deposit" ? (
          <DepositForm />
        ) : (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <p>Formulario de {modalConfig.title} en Proceso...</p>
          </div>
        )}
      </ActionModal>

      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        availableBalance={balance}
        accountId={activeAccount?.id || ""}
        onSuccess={handleWithdrawSuccess}
      />

      <InternalTransferModal
        isOpen={isInternalTransferOpen}
        onClose={() => setIsInternalTransferOpen(false)}
        direction={internalTransferDirection}
        isBlocked={!withdrawalWindow.isOpen}
        onSuccess={handleWithdrawSuccess}
      />
    </>
  );
}
