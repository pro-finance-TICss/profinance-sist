// ============================================================================
// COMPONENTE INPUT REUTILIZABLE
// ============================================================================
// Input con soporte para React Hook Form (forwardRef), labels y errores.
// ============================================================================

import React, { forwardRef } from "react";

/**
 * Props del componente Input.
 */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Etiqueta visible del input */
  label: string;
  /** ID opcional (se genera automáticamente si no se proporciona) */
  id?: string;
  /** Mensaje de error a mostrar */
  error?: string;
}

/**
 * @component Input
 * @description Input reutilizable con soporte para React Hook Form.
 * Utiliza forwardRef para permitir el registro con RHF.
 *
 * @example
 * ```tsx
 * <Input
 *   label="Email"
 *   type="email"
 *   {...register("email")}
 *   error={errors.email?.message}
 * />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, id, error, className = "", name, ...props }, ref) => {
    // Usar id si está definido, sino usar name, sino generar uno único
    const inputId =
      id || name || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={`input-group ${className}`}>
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          name={name}
          className={error ? "input-error" : ""}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <span id={`${inputId}-error`} className="error-message">
            {error}
          </span>
        )}

        <style jsx>{`
          .input-label {
            display: block;
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.85rem;
            margin-bottom: 0.4rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .error-message {
            color: #ff4d4f;
            font-size: 0.8rem;
            margin-top: 0.25rem;
            display: block;
          }
          .input-error {
            border-color: #ff4d4f !important;
          }
        `}</style>
      </div>
    );
  }
);

// DisplayName para debugging en React DevTools
Input.displayName = "Input";
