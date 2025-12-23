import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  error?: string;
}

/**
 * @component Input
 * @description Input reutilizable con etiqueta y mensaje de error.
 */
export function Input({
  label,
  id,
  error,
  className = "",
  ...props
}: InputProps) {
  return (
    <div className={`input-group ${className}`}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        className={error ? "input-error" : ""}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <span id={`${id}-error`} className="error-message">
          {error}
        </span>
      )}

      <style jsx>{`
        .error-message {
          color: #ff4d4f;
          font-size: 0.85rem;
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
