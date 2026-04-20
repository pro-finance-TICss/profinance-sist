"use client";
import React, { useState, useEffect, useCallback } from "react";
import { BalanceCard } from "./BalanceCard";
import { DepositModal } from "./DepositModal";
import { WithdrawModal } from "./WithdrawModal";
import { InternalTransferModal } from "./InternalTransferModal";
import { BankAccountList } from "./BankAccountList";
import { Wallet, Banknote, ArrowRight, Lock } from "lucide-react";
import {
  checkWithdrawalWindowStatus,
  checkAndSendWithdrawalNotification,
} from "@/lib/actions/wallet-checks";
import { PageHeader } from "@/components/PageHeader";
import { useAccount } from "@/contexts/AccountContext";
import { logger } from "@/lib/logger";

// Tipos
interface BalanceData {
  investedCapital: number;
}

interface WithdrawalRequest {
  id: string;
  accountId?: string;
  amount: number;
  status: string;
  requestedAt: string;
  processedAt?: string | null;
  notes?: string | null;
}

export function WalletView() {
  // Obtener cuenta activa del contexto
  const { activeAccount } = useAccount();

  // Estados de datos
  const [balance, setBalance] = useState<BalanceData>({
    investedCapital: 0,
  });
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de modales
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isInternalTransferOpen, setIsInternalTransferOpen] = useState(false);
  const [internalTransferDirection, setInternalTransferDirection] = useState<"TO_INVESTMENT" | "TO_SAVINGS">("TO_INVESTMENT");
  const [withdrawalWindow, setWithdrawalWindow] = useState<{
    isOpen: boolean;
    reason?: string;
  }>({ isOpen: true });

  // Cargar datos (scoped por accountId)
  const fetchData = useCallback(async () => {
    if (!activeAccount) return;

    try {
      setIsLoading(true);

      const [balanceRes, withdrawalsRes] = await Promise.all([
        fetch(`/api/wallet/balance?accountId=${activeAccount.id}`),
        fetch("/api/wallet/withdrawals"),
      ]);

      if (balanceRes.ok) {
        const data = await balanceRes.json();
        setBalance(data.balance);
      }

      if (withdrawalsRes.ok) {
        const data = await withdrawalsRes.json();
        setWithdrawals(data.withdrawals);
      }
    } catch (error) {
      logger.error("Error cargando datos de billetera:", error);
    } finally {
      setIsLoading(false);
    }
  }, [activeAccount]);

  // Verificar estado de ventana de retiros y notificaciones
  useEffect(() => {
    const checkStatus = async () => {
      // 1. Verificar si la ventana está abierta
      const status = await checkWithdrawalWindowStatus();
      setWithdrawalWindow(status);

      // 2. Verificar si se debe enviar notificación (lazy check)
      await checkAndSendWithdrawalNotification();
    };
    checkStatus();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calcular retiros pendientes
  const pendingWithdrawal = withdrawals
    .filter((w) => w.status === "PENDING" && w.accountId === activeAccount?.id)
    .reduce((acc, curr) => acc + Number(curr.amount), 0);
  
  const isInvestment = activeAccount?.type === "INVESTMENT";

  return (

    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* 🟢 PASO FINAL SEMANA 3: Cabecera unificada */}
      <PageHeader
        title="Mi Billetera"
        subtitle="Visualiza tu capital invertido, gestiona tus fondos y liquida tus ganancias."
      />

      {/* 1. Sección Superior: Balance y Acciones */}
      <div className="wallet-top-section">
        {/* Tarjeta de Balance */}
        <div style={{ minHeight: "200px" }}>
          <BalanceCard
            investedCapital={balance.investedCapital}
            pendingWithdrawal={pendingWithdrawal}
          />
        </div>

        {/* Acciones (Depositar / Retirar) */}
        <div
          style={{
            display: "grid",
            gridTemplateRows: "1fr 1fr",
            gap: "16px",
            height: "100%",
          }}
        >
          <button
            onClick={() => {
              if (isInvestment) {
                setInternalTransferDirection("TO_INVESTMENT");
                setIsInternalTransferOpen(true);
              } else {
                setIsDepositModalOpen(true);
              }
            }}
            className="action-card"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              padding: "24px",
              background: "rgba(189, 142, 72, 0.1)",
              border: "1px solid rgba(189, 142, 72, 0.2)",
              borderRadius: "20px",
              cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "#bd8e48",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#000",
                }}
              >
                <Wallet size={24} strokeWidth={1.5} />
              </div>
              <div>
                <h4
                  style={{
                    color: "#fff",
                    fontSize: "1.1rem",
                    fontWeight: "700",
                    margin: 0,
                  }}
                >
                  {isInvestment ? "Aportar de Ahorros" : "Depositar Fondos"}
                </h4>
                <p
                  style={{
                    color: "rgba(255, 255, 255, 0.6)",
                    fontSize: "0.85rem",
                    margin: "4px 0 0 0",
                  }}
                >
                  {isInvestment ? "Pasa fondos para invertirlos" : "Carga capital a tu cuenta"}
                </p>
              </div>
            </div>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <ArrowRight size={16} />
            </div>
          </button>

          {/* Botón Retirar / Pasar a Ahorros */}
          <button
            onClick={() => {
              if (isInvestment) {
                setInternalTransferDirection("TO_SAVINGS");
                setIsInternalTransferOpen(true);
              } else {
                setIsWithdrawModalOpen(true); // SAVINGS siempre puede retirar según nuevas reglas
              }
            }}
            className="action-card"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              padding: "24px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "20px",
              cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              textAlign: "left",
              opacity: 1,
            }}
            title={isInvestment ? "Pasar dinero a Cajita de Ahorros" : "Solicitar retiro al Banco"}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                }}
              >
                  <Banknote size={24} strokeWidth={1.5} />
              </div>
              <div>
                <h4
                  style={{
                    color: "#fff",
                    fontSize: "1.1rem",
                    fontWeight: "700",
                    margin: 0,
                  }}
                >
                  {isInvestment ? "Mover a Ahorros" : "Retirar al Banco"}
                </h4>
                <p
                  style={{
                    color: "rgba(255, 255, 255, 0.6)",
                    fontSize: "0.85rem",
                    margin: "4px 0 0 0",
                  }}
                >
                  {isInvestment ? "Liquida fondos de tu Inversión" : "Liquida a tu cuenta bancaria"}
                </p>
              </div>
            </div>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "rgba(255, 255, 255, 0.5)",
              }}
            >
              <ArrowRight size={16} />
            </div>
          </button>
        </div>
      </div>

      {/* 2. Sección de Cuentas Bancarias */}
      <BankAccountList />

      {/* Modales */}
      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        onSuccess={() => {
          setIsDepositModalOpen(false);
        }}
      />

      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        availableBalance={balance.investedCapital}
        accountId={activeAccount?.id || ""}
        onSuccess={fetchData}
      />

      <InternalTransferModal
        isOpen={isInternalTransferOpen}
        onClose={() => setIsInternalTransferOpen(false)}
        direction={internalTransferDirection}
        isBlocked={!withdrawalWindow.isOpen}
        onSuccess={fetchData}
      />


      <style jsx>{`
        .wallet-top-section {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        @media (min-width: 900px) {
          .wallet-top-section {
            grid-template-columns: 1.2fr 1fr;
          }
        }
        .action-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.3);
        }
        .action-card:not(.disabled):hover h4 {
          color: #bd8e48 !important;
        }
        .action-card.disabled {
          box-shadow: none !important;
          transform: none !important;
        }
      `}</style>
    </div>
  );
}
