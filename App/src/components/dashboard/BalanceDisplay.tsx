import React from "react";
import styles from "./BalanceDisplay.module.css";

/**
 * Props del componente BalanceDisplay.
 */
interface BalanceDisplayProps {
  /** Monto del balance a mostrar */
  amount: number;
  /** Etiqueta opcional para el balance */
  label?: string;
  /** Moneda a mostrar (por defecto USD) */
  currency?: string;
}

/**
 * @component BalanceDisplay
 * @description Componente especializado para mostrar el balance de cuenta.
 * Formatea el monto con separadores de miles y símbolo de moneda.
 *
 * @example
 * ```tsx
 * <BalanceDisplay
 *   amount={15000.50}
 *   label="Balance Disponible"
 *   currency="USD"
 * />
 * ```
 */
export function BalanceDisplay({
  amount,
  label = "Balance Disponible",
  currency = "USD",
}: BalanceDisplayProps) {
  // Formatear el monto con separadores de miles
  const formattedAmount = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return (
    <div className={styles.balanceContainer}>
      <p className={styles.balanceLabel}>{label}</p>
      <h2 className={styles.balanceAmount}>{formattedAmount}</h2>
    </div>
  );
}
