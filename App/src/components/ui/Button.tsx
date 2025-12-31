import React, { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

/**
 * Tipos de variantes de botón disponibles.
 */
type ButtonVariant = "primary" | "outline" | "danger";

/**
 * Props del componente Button.
 */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Variante visual del botón */
  variant?: ButtonVariant;
  /** Texto o componentes a mostrar dentro del botón */
  children: React.ReactNode;
  /** Clase CSS adicional */
  className?: string;
}

/**
 * @component Button
 * @description Componente de botón reutilizable con diferentes variantes visuales.
 * Sigue el estilo de Pro-Finance con gradientes dorados y efectos hover.
 *
 * @example
 * ```tsx
 * <Button variant="primary" onClick={handleClick}>
 *   Enviar
 * </Button>
 * ```
 */
export function Button({
  variant = "primary",
  children,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  const variantClass = styles[variant] || styles.primary;

  return (
    <button
      className={`${styles.button} ${variantClass} ${className}`}
      disabled={disabled}
      {...rest}
    >
      <span className={styles.buttonText}>{children}</span>
    </button>
  );
}
