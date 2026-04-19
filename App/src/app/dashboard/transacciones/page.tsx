"use client";
import React, { useState, useEffect, useCallback } from "react";
import { TransactionHistory } from "@/components/dashboard/billetera/TransactionHistory";
import { WithdrawalStatus } from "@/components/dashboard/billetera/WithdrawalStatus";
import { PageHeader } from "@/components/PageHeader";
import { logger } from "@/lib/logger";

// Tipos
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

export default function TransaccionesPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar datos
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      const [transactionsRes, withdrawalsRes] = await Promise.all([
        fetch("/api/wallet/transactions"), // Todas las transacciones
        fetch("/api/wallet/withdrawals"),
      ]);

      if (transactionsRes.ok) {
        const data = await transactionsRes.json();
        setTransactions(data.transactions);
      }

      if (withdrawalsRes.ok) {
        const data = await withdrawalsRes.json();
        setWithdrawals(data.withdrawals);
      }
    } catch (error) {
      logger.error("Error cargando datos de transacciones:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <PageHeader
        title="Transacciones"
        subtitle="Historial de movimientos y solicitudes de retiro."
      />

      {/* Tablas en dos columnas */}
      <div className="transactions-grid">
        {/* Columna 1: Solicitudes de Retiro */}
        <div>
          <WithdrawalStatus 
            withdrawals={withdrawals} 
            isLoading={isLoading} 
            onCancelSuccess={fetchData} 
          />
        </div>

        {/* Columna 2: Historial de Transacciones */}
        <div>
          <TransactionHistory
            transactions={transactions}
            isLoading={isLoading}
          />
        </div>
      </div>

      <style jsx>{`
        .transactions-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        
        @media (min-width: 1200px) {
          .transactions-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}
