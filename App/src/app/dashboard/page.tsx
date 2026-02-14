"use client";

import React, { useState, useEffect } from "react";
// Imports de Setup-Rama10 (Semana 3)
import { PageHeader } from "@/components/PageHeader";
import { Plus } from "lucide-react";

import { useDashboard } from "@/contexts/DashboardContext";
import { BalanceSection } from "../../components/dashboard/BalanceSection";
import { ActivitySection } from "../../components/dashboard/ActivitySection";
import { QuickActions } from "../../components/dashboard/QuickActions";
import { SummaryCards } from "../../components/dashboard/SummaryCards";
import { ActionModal } from "../../components/dashboard/ActionModal";
import { DepositForm } from "../../components/dashboard/DepositForm";
import { PerformanceTable } from "../../components/dashboard/PerformanceTable";
import { WithdrawModal } from "../../components/dashboard/billetera/WithdrawModal";
import { checkWithdrawalWindowStatus } from "@/lib/actions/wallet-checks";

export default function DashboardPage() {
  const { isMobile } = useDashboard();

  // --- ESTADOS PARA MODALES Y LOGICA DE NEGOCIO ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({ title: "", type: "" });
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [balance, setBalance] = useState(0);
  const [withdrawalWindow, setWithdrawalWindow] = useState<{
    isOpen: boolean;
    reason?: string;
  }>({ isOpen: true });

  // Verificar estado de ventana de retiros (Rama10)
  useEffect(() => {
    const checkStatus = async () => {
      const status = await checkWithdrawalWindowStatus();
      setWithdrawalWindow(status);
    };
    checkStatus();
  }, []);

  // Sincronización de Balance con API (Rama10)
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch("/api/wallet/balance");
        if (res.ok) {
          const data = await res.json();
          setBalance(data.balance?.investedCapital || 0);
        }
      } catch (error) {
        console.error("Error fetching balance:", error);
      }
    };
    fetchBalance();
  }, []);

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
    try {
      const res = await fetch("/api/wallet/balance");
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance?.investedCapital || 0);
      }
    } catch (error) {
      console.error("Error reloading balance:", error);
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
        onSuccess={handleWithdrawSuccess}
      />
    </>
  );
} 
