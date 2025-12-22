"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulación de registro
    setTimeout(() => {
      setIsLoading(false);
      alert("Registro exitoso. Ahora puedes iniciar sesión.");
      router.push("/login");
    }, 1500);
  };

  return (
    <main className="auth-container">
      <div className="auth-card">
        <header className="auth-header">
          <h1 className="company-name">ProFinance</h1>
          <p style={{ color: "rgba(255,255,255,0.6)", marginTop: "1rem" }}>
            Únete a la élite financiera
          </p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="fullname" className="sr-only">
              Nombre Completo
            </label>
            <input
              type="text"
              id="fullname"
              placeholder="Nombre Completo"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="email" className="sr-only">
              Correo Electrónico
            </label>
            <input
              type="email"
              id="email"
              placeholder="Correo Electrónico"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="username" className="sr-only">
              Usuario
            </label>
            <input
              type="text"
              id="username"
              placeholder="Nombre de Usuario"
              required
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
            />
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading}>
            <span className="btn-text">
              {isLoading ? "PROCESANDO..." : "CREAR CUENTA"}
            </span>
          </button>

          <div className="auth-footer">
            ¿Ya tienes una cuenta?
            <Link href="/login">Iniciar Sesión</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
