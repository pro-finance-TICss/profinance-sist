"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export default function VerificationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulación de verificación 2FA
    setTimeout(() => {
      setIsLoading(false);
      alert("Verificación exitosa. Bienvenido.");
      // router.push("/dashboard"); // Redirect to actual system
    }, 1500);
  };

  return (
    <main className="auth-container">
      <div className="auth-card">
        <header className="auth-header">
          <h1 className="company-name">ProFinance</h1>
          <h2
            style={{
              fontSize: "1.2rem",
              color: "var(--color-gold-start)",
              marginTop: "1.5rem",
              letterSpacing: "2px",
            }}
          >
            VERIFICACIÓN 2FA
          </h2>
          <p
            style={{
              color: "rgba(255,255,255,0.6)",
              marginTop: "0.5rem",
              fontSize: "0.9rem",
            }}
          >
            Ingresa el código que enviamos a tu dispositivo
          </p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="otp-inputs">
            {otp.map((digit, index) => (
              <input
                key={index}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                className="otp-field"
                autoFocus={index === 0}
              />
            ))}
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading || otp.some((d) => !d)}
          >
            <span className="btn-text">
              {isLoading ? "VERIFICANDO..." : "CONFIRMAR CÓDIGO"}
            </span>
          </button>

          <div
            className="auth-footer"
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <button
              type="button"
              onClick={() => alert("Se ha enviado un nuevo código")}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-gold-start)",
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: "600",
              }}
            >
              REENVIAR CÓDIGO
            </button>
            <Link
              href="/login"
              style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}
            >
              Volver al inicio de sesión
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
