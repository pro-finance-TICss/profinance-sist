"use client";
import React, { useState, useEffect, useCallback } from "react";
import { BalanceCard } from "./BalanceCard";
import { TransactionHistory } from "./TransactionHistory";
import { WithdrawalStatus } from "./WithdrawalStatus";
import { DepositModal } from "./DepositModal";
import { WithdrawModal } from "./WithdrawModal";
import { BankAccountList } from "./BankAccountList";
import { Wallet, Banknote, ArrowRight, Lock } from "lucide-react";
import {
  checkWithdrawalWindowStatus,
  checkAndSendWithdrawalNotification,
} from "@/lib/actions/wallet-checks";

// Tipos
interface BalanceData {
  investedCapital: number;
  availableBalance: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  requestedAt: string;
  processedAt?: string | null;
  notes?: string | null;
}

export function WalletView() {
  // Estados de datos
  const [balance, setBalance] = useState<BalanceData>({
    investedCapital: 0,
    availableBalance: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de modales
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawalWindow, setWithdrawalWindow] = useState<{
    isOpen: boolean;
    reason?: string;
  }>({ isOpen: true });

  // Cargar datos
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      const [balanceRes, transactionsRes, withdrawalsRes] = await Promise.all([
        fetch("/api/wallet/balance"),
        fetch("/api/wallet/transactions?limit=5"), // Últimas 5 transacciones
        fetch("/api/wallet/withdrawals"),
      ]);

      if (balanceRes.ok) {
        const data = await balanceRes.json();
        setBalance(data.balance);
      }

      if (transactionsRes.ok) {
        const data = await transactionsRes.json();
        setTransactions(data.transactions);
      }

      if (withdrawalsRes.ok) {
        const data = await withdrawalsRes.json();
        setWithdrawals(data.withdrawals);
      }
    } catch (error) {
      console.error("Error cargando datos de billetera:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    .filter((w) => w.status === "PENDING")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* 1. Sección Superior: Balance y Acciones */}
      <div className="wallet-top-section">
        {/* Tarjeta de Balance */}
        <div style={{ minHeight: "200px" }}>
          <BalanceCard
            investedCapital={balance.investedCapital}
            availableBalance={balance.availableBalance}
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
          {/* Botón Depositar */}
          <button
            onClick={() => setIsDepositModalOpen(true)}
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
                  Depositar Fondos
                </h4>
                <p
                  style={{
                    color: "rgba(255, 255, 255, 0.6)",
                    fontSize: "0.85rem",
                    margin: "4px 0 0 0",
                  }}
                >
                  Carga capital a tu cuenta
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

          {/* Botón Retirar */}
          <button
            onClick={() => {
              if (withdrawalWindow.isOpen) {
                setIsWithdrawModalOpen(true);
              }
            }}
            className={`action-card ${
              !withdrawalWindow.isOpen ? "disabled" : ""
            }`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              padding: "24px",
              background: withdrawalWindow.isOpen
                ? "rgba(255, 255, 255, 0.03)"
                : "rgba(255, 255, 255, 0.01)", // Más oscuro si disabled
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "20px",
              cursor: withdrawalWindow.isOpen ? "pointer" : "not-allowed",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              textAlign: "left",
              opacity: withdrawalWindow.isOpen ? 1 : 0.6,
            }}
            title={
              !withdrawalWindow.isOpen
                ? withdrawalWindow.reason
                : "Solicitar retiro"
            }
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: withdrawalWindow.isOpen
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(255, 255, 255, 0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: withdrawalWindow.isOpen
                    ? "#fff"
                    : "rgba(255,255,255,0.4)",
                }}
              >
                {withdrawalWindow.isOpen ? (
                  <Banknote size={24} strokeWidth={1.5} />
                ) : (
                  <Lock size={24} strokeWidth={1.5} />
                )}
              </div>
              <div>
                <h4
                  style={{
                    color: withdrawalWindow.isOpen
                      ? "#fff"
                      : "rgba(255,255,255,0.5)",
                    fontSize: "1.1rem",
                    fontWeight: "700",
                    margin: 0,
                  }}
                >
                  Retirar Ganancias
                </h4>
                <p
                  style={{
                    color: "rgba(255, 255, 255, 0.6)",
                    fontSize: "0.85rem",
                    margin: "4px 0 0 0",
                  }}
                >
                  {!withdrawalWindow.isOpen
                    ? "Periodo cerrado"
                    : "Liquida a tu cuenta bancaria"}
                </p>
              </div>
            </div>
            {withdrawalWindow.isOpen && (
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
            )}
          </button>
        </div>
      </div>

      {/* 2. Estado de Retiros (si hay) */}
      {withdrawals.length > 0 && (
        <div style={{ width: "100%" }}>
          <WithdrawalStatus withdrawals={withdrawals} isLoading={isLoading} />
        </div>
      )}

      {/* 3. Sección de Cuentas Bancarias */}
      <BankAccountList />

      {/* 4. Historial de Transacciones */}
      <TransactionHistory transactions={transactions} isLoading={isLoading} />

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
        availableBalance={balance.availableBalance}
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
