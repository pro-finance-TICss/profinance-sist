"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BalanceDisplay } from "@/components/dashboard/BalanceDisplay";
import { Input } from "@/components/ui/Input";
import { depositSchema, withdrawalSchema } from "@/lib/schemas";
import type { DepositFormData, WithdrawalFormData } from "@/lib/schemas";
import { z } from "zod";
import styles from "./page.module.css";

/**
 * @page FondosPage
 * @route /dashboard/fondos
 * @description Página de gestión de fondos del usuario.
 * Permite consultar el balance, realizar depósitos y retiros con validación Zod.
 */
export default function FondosPage() {
  // Estado del balance (simulado - en producción vendría de API)
  const [balance, setBalance] = useState(25000);

  // Tab activo: 'deposit' o 'withdraw'
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");

  // Estados de formularios
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  /**
   * Maneja el depósito de fondos.
   */
  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage("");
    setIsLoading(true);

    try {
      // Validar con Zod
      const data: DepositFormData = depositSchema.parse({
        amount: parseFloat(depositAmount),
      });

      // Simular llamada a API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Actualizar balance
      setBalance((prev) => prev + data.amount);
      setSuccessMessage(
        `Depósito de $${data.amount.toLocaleString()} realizado con éxito.`
      );
      setDepositAmount("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Maneja el retiro de fondos.
   */
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const amount = parseFloat(withdrawAmount);

      // Validar con Zod
      const data: WithdrawalFormData = withdrawalSchema.parse({
        amount,
      });

      // Validación adicional: verificar balance suficiente
      if (data.amount > balance) {
        setErrors({ amount: "Fondos insuficientes para realizar el retiro." });
        setIsLoading(false);
        return;
      }

      // Simular llamada a API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Actualizar balance
      setBalance((prev) => prev - data.amount);
      setSuccessMessage(
        `Retiro de $${data.amount.toLocaleString()} realizado con éxito.`
      );
      setWithdrawAmount("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Gestión de Fondos">
      <div className={styles.container}>
        {/* Balance Display */}
        <BalanceDisplay amount={balance} label="Balance Disponible" />

        {/* Success Message */}
        {successMessage && (
          <div className={styles.successMessage}>{successMessage}</div>
        )}

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${
              activeTab === "deposit" ? styles.activeTab : ""
            }`}
            onClick={() => {
              setActiveTab("deposit");
              setErrors({});
              setSuccessMessage("");
            }}
          >
            Depositar
          </button>
          <button
            className={`${styles.tab} ${
              activeTab === "withdraw" ? styles.activeTab : ""
            }`}
            onClick={() => {
              setActiveTab("withdraw");
              setErrors({});
              setSuccessMessage("");
            }}
          >
            Retirar
          </button>
        </div>

        {/* Deposit Form */}
        {activeTab === "deposit" && (
          <Card title="Realizar Depósito">
            <form onSubmit={handleDeposit} className={styles.form}>
              <Input
                label="Monto a depositar"
                type="number"
                step="0.01"
                placeholder="Ejemplo: 1000.00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                error={errors.amount}
              />

              <Button
                type="submit"
                variant="primary"
                disabled={isLoading || !depositAmount}
              >
                {isLoading ? "Procesando..." : "Confirmar Depósito"}
              </Button>
            </form>
          </Card>
        )}

        {/* Withdraw Form */}
        {activeTab === "withdraw" && (
          <Card title="Realizar Retiro">
            <form onSubmit={handleWithdraw} className={styles.form}>
              <Input
                label="Monto a retirar"
                type="number"
                step="0.01"
                placeholder="Ejemplo: 500.00"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                error={errors.amount}
              />

              <p className={styles.warningText}>
                Asegúrate de tener fondos suficientes antes de realizar el
                retiro.
              </p>

              <Button
                type="submit"
                variant="primary"
                disabled={isLoading || !withdrawAmount}
              >
                {isLoading ? "Procesando..." : "Confirmar Retiro"}
              </Button>
            </form>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
