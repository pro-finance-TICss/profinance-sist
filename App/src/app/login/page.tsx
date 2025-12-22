"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulación de validación y redirección a verificación (2FA)
    setTimeout(() => {
      setIsLoading(false);
      router.push("/verification");
    }, 1500);
  };

  return (
    <main className="auth-container">
      <header className="system-header">
        <div className="header-inner">
          <div className="header-left">
            <img
              src="/logo2temp.png"
              alt="ProFinance Logo"
              className="header-logo"
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

      <div className="auth-card">
        <header className="auth-header"></header>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username" className="sr-only">
              Usuario
            </label>
            <input
              type="text"
              id="username"
              placeholder="Usuario"
              required
              autoComplete="username"
            />
          </div>

          <div className="input-group">
            <label htmlFor="password" className="sr-only">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              placeholder="Contraseña"
              required
              autoComplete="current-password"
            />
          </div>

          <div className="form-actions">
            <Link href="#" className="forgot-password">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading}>
            <span className="btn-text">
              {isLoading ? "CARGANDO..." : "INICIAR SESIÓN"}
            </span>
          </button>

          <div className="auth-footer">
            ¿No tienes cuenta?
            <Link href="/register">Registrarse</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
