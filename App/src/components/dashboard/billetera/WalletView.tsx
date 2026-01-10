"use client";
import React, { useState, useEffect, useCallback } from "react";
import { BalanceCard } from "./BalanceCard";
import { QuickActions } from "../QuickActions";
import { TransactionHistory } from "./TransactionHistory";
import { WithdrawalStatus } from "./WithdrawalStatus";
import { DepositModal } from "./DepositModal";
import { WithdrawModal } from "./WithdrawModal";

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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Manejador de acciones
  const handleActionClick = (title: string, id: string) => {
    switch (id) {
      case "deposit":
        setIsDepositModalOpen(true);
        break;
      case "withdraw":
        setIsWithdrawModalOpen(true);
        break;
      case "transfer":
        // Implementar transferencia en el futuro
        console.log("Transferencia no implementada aún");
        break;
      case "invest":
        // Redirigir a inversiones o mostrar modal
        break;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* 1. Sección Superior: Balance y Acciones */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "24px",
        }}
      >
        {/* Tarjeta de Balance (8 columnas en desktop, 12 en móvil) */}
        <div
          style={{ gridColumn: "span 12" }}
          className="col-span-12 lg:col-span-8"
        >
          <BalanceCard
            investedCapital={balance.investedCapital}
            availableBalance={balance.availableBalance}
          />
        </div>

        {/* Acciones Rápidas (4 columnas en desktop, 12 en móvil) */}
        {/* Nota: QuickActions ya tiene su propio Card container, pero aquí
            queremos que se integre en el grid. 
            Vamos a usarlo tal cual, adaptando el contenedor si es necesario. */}
        <div
          style={{ gridColumn: "span 12" }}
          className="col-span-12 lg:col-span-4"
        >
          <QuickActions onActionClick={handleActionClick} />
        </div>
      </div>

      {/* 2. Sección Inferior: Estados y Transacciones */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "24px",
        }}
      >
        {/* Estado de Retiros (si hay) */}
        {withdrawals.length > 0 && (
          <div
            style={{ gridColumn: "span 12" }}
            className="col-span-12 lg:col-span-4"
          >
            <WithdrawalStatus withdrawals={withdrawals} isLoading={isLoading} />
          </div>
        )}

        {/* Historial de Transacciones */}
        <div
          style={{
            gridColumn: "span 12",
          }}
          className={
            withdrawals.length > 0 ? "col-span-12 lg:col-span-8" : "col-span-12"
          }
        >
          <TransactionHistory
            transactions={transactions}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Modales */}
      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        onSuccess={() => {
          setIsDepositModalOpen(false);
          // Recargar datos tras depósito exitoso
          // Pequeño delay para dar tiempo a que Mercado Pago procese el webhook
          // aunque el modal ya redirige.
          // En caso de éxito desde webhook, el usuario vuelve a dashboard?deposit=success
          // Aquí solo manejamos el cierre.
        }}
      />

      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        availableBalance={balance.availableBalance}
        onSuccess={fetchData} // Recargar datos tras solicitar retiro
      />

      {/* Estilos responsivos inline para el grid */}
      <style jsx>{`
        @media (min-width: 1024px) {
          .lg\\:col-span-8 {
            grid-column: span 8 !important;
          }
          .lg\\:col-span-4 {
            grid-column: span 4 !important;
          }
        }
        .col-span-12 {
          grid-column: span 12 !important;
        }
      `}</style>
    </div>
  );
}
