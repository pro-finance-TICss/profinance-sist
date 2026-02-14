"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";

import { useDashboard } from "@/contexts/DashboardContext";
import { useAccount } from "@/contexts/AccountContext";
import { BalanceSection } from "../../components/dashboard/BalanceSection";
import { ActivitySection } from "../../components/dashboard/ActivitySection";
import { QuickActions } from "../../components/dashboard/QuickActions";
import { SummaryCards } from "../../components/dashboard/SummaryCards";
import { ActionModal } from "../../components/dashboard/ActionModal";
import { DepositForm } from "../../components/dashboard/DepositForm";
import { PerformanceTable } from "../../components/dashboard/PerformanceTable";
import { WithdrawModal } from "../../components/dashboard/billetera/WithdrawModal";
import { checkWithdrawalWindowStatus } from "@/lib/actions/wallet-checks";
import { logger } from "@/lib/logger";

export default function DashboardPage() {
  const { isMobile } = useDashboard();
  const { activeAccount } = useAccount();

  // --- ESTADOS PARA MODALES Y LOGICA DE NEGOCIO ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({ title: "", type: "" });
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
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

  // Sincronizar balance con la cuenta activa
  useEffect(() => {
    if (!activeAccount) return;
    const fetchBalance = async () => {
      try {
        const res = await fetch(`/api/wallet/balance?accountId=${activeAccount.id}`);
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
    if (type === "withdraw") {
      if (withdrawalWindow.isOpen) {
        setIsWithdrawModalOpen(true);
      }
    } else {
      setModalConfig({ title, type });
      setIsModalOpen(true);
    }
  };

  const handleWithdrawSuccess = async () => {
    if (!activeAccount) return;
    try {
      const res = await fetch(`/api/wallet/balance?accountId=${activeAccount.id}`);
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
      {/* 🟢 Implementación Senior: PageHeader centralizado */}
      <PageHeader
        title="Resumen Financiero"
        subtitle="Monitorea tus activos y actividad en tiempo real."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "24px",
        }}
      >
        <div style={{ gridColumn: isMobile ? "span 12" : "span 8" }}>
          <BalanceSection />
        </div>
        <div style={{ gridColumn: isMobile ? "span 12" : "span 4" }}>
          <ActivitySection />
        </div>

        <div style={{ gridColumn: "span 12" }}>
          <SummaryCards />
        </div>

        <div style={{ gridColumn: "span 12" }}>
          <QuickActions
            onActionClick={handleOpenModal}
            withdrawalWindow={withdrawalWindow}
          />
        </div>

        <div style={{ gridColumn: "span 12" }}>
          <PerformanceTable />
        </div>
      </div>

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
    </>
  );
} 
