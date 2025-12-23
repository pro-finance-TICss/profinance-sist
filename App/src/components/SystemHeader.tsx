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
        <div className="header-left">
          <img
            src="/logo2temp.png"
            alt="ProFinance Logo"
            className="header-logo"
            // Optimización: en producción usar Image de next/image
            width="40"
            height="40"
          />
          <span className="header-brand">PRO-FINANCE</span>
        </div>
        <div className="header-right">
          <span className="header-slogan">
            Empoderando tu futuro financiero
          </span>
        </div>
      </div>
    </header>
  );
}
