/* eslint-disable @next/next/no-img-element */
import React from "react";

/**
 * @component SystemHeader
 * @description Cabecera unificada del sistema (Login/Registro/Dashboard).
 * Muestra el logo y el eslogan.
 */
export function SystemHeader() {
  return (
    <header className="system-header">
      <div className="header-inner">
        {/* Logo y Nombre */}
        <a href="/" className="header-left">
          <img
            src="/logo2temp.png"
            alt="Pro-Finance Logo"
            className="header-logo"
            width="60"
            height="40"
          />
          <span className="header-brand">PRO-FINANCE</span>
        </a>

        {/* Eslogan / Botón */}
        <div className="header-right">
          <span className="header-slogan">
            Empoderando tu futuro financiero
          </span>
        </div>
      </div>
    </header>
  );
}
