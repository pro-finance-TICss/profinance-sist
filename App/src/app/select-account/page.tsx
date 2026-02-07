"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@/contexts/AccountContext";

/**
 * Página de selección de cuenta
 * 
 * FLUJOS:
 * 1. Si isLoading → Mostrar spinner
 * 2. Si 0 cuentas → Mostrar mensaje de onboarding
 * 3. Si 1 cuenta → Auto-selección + redirección a dashboard
 * 4. Si >1 cuentas → Mostrar lista de selección
 * 5. Si activeAccount ya existe → Redirigir a dashboard (Guard)
 * 
 * ESTILOS:
 * - Reutiliza clases de globals.css (CSS-First estricto)
 * - NO crea estilos nuevos
 */
export default function SelectAccountPage() {
    const { accounts, activeAccount, setActiveAccount, isLoading } = useAccount();
    const router = useRouter();

    // ================================================================
    // GUARD: Redirigir si ya hay cuenta activa
    // ================================================================
    useEffect(() => {
        if (!isLoading && activeAccount) {
            console.log("✅ Cuenta activa detectada, redirigiendo a dashboard");
            router.replace("/dashboard");
        }
    }, [activeAccount, isLoading, router]);

    // ================================================================
    // AUTO-SELECCIÓN: Si solo hay 1 cuenta
    // ================================================================
    useEffect(() => {
        if (!isLoading && accounts.length === 1 && !activeAccount) {
            console.log("🔄 Auto-seleccionando única cuenta disponible");
            setActiveAccount(accounts[0].id);
            router.replace("/dashboard");
        }
    }, [accounts, isLoading, activeAccount, setActiveAccount, router]);

    // ================================================================
    // HANDLER: Selección manual de cuenta
    // ================================================================
    const handleSelectAccount = (accountId: string) => {
        setActiveAccount(accountId);
        router.replace("/dashboard");
    };

    // ================================================================
    // RENDER: Loading
    // ================================================================
    if (isLoading) {
        return (
            <div
                style={{
                    display: "flex",
                    height: "100vh",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: "1rem",
                }}
            >
                <div
                    style={{
                        width: "50px",
                        height: "50px",
                        border: "4px solid rgba(189, 142, 72, 0.2)",
                        borderTop: "4px solid var(--color-gold-start)",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                    }}
                />
                <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.9rem" }}>
                    Cargando cuentas...
                </p>
                <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
            </div>
        );
    }

    // ================================================================
    // RENDER: Sin cuentas (Onboarding)
    // ================================================================
    if (accounts.length === 0) {
        return (
            <div className="auth-container">
                <div className="auth-card" style={{ backdropFilter: "blur(10px)" }}>
                    <div className="auth-header">
                        <h1 className="company-name">PRO-FINANCE</h1>
                    </div>

                    <div style={{ textAlign: "center", marginTop: "2rem" }}>
                        <svg
                            width="80"
                            height="80"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--color-gold-start)"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ margin: "0 auto 1.5rem" }}
                        >
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>

                        <h2
                            style={{
                                fontSize: "1.5rem",
                                color: "var(--color-white)",
                                marginBottom: "1rem",
                            }}
                        >
                            Bienvenido a ProFinance
                        </h2>

                        <p
                            style={{
                                color: "rgba(255, 255, 255, 0.6)",
                                fontSize: "0.95rem",
                                lineHeight: "1.6",
                                marginBottom: "2rem",
                            }}
                        >
                            Aún no tienes cuentas configuradas.
                            <br />
                            Por favor, contacta con soporte para activar tu cuenta.
                        </p>

                        <button
                            className="btn-primary"
                            onClick={() => router.replace("/dashboard/soporte")}
                        >
                            <span className="btn-text">Contactar Soporte</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ================================================================
    // RENDER: Selección de cuenta (>1 cuentas)
    // ================================================================
    return (
        <div className="auth-container">
            <div className="auth-card" style={{ backdropFilter: "blur(10px)" }}>
                <div className="auth-header">
                    <h1 className="company-name">Selecciona tu Cuenta</h1>
                    <p
                        style={{
                            color: "rgba(255, 255, 255, 0.6)",
                            fontSize: "0.9rem",
                            marginTop: "0.5rem",
                            textAlign: "center",
                        }}
                    >
                        Elige la cuenta con la que deseas operar
                    </p>
                </div>

                <div
                    className="auth-form"
                    style={{ gap: "1rem", marginTop: "1.5rem" }}
                >
                    {accounts.map((account) => (
                        <button
                            key={account.id}
                            onClick={() => handleSelectAccount(account.id)}
                            style={{
                                width: "100%",
                                background: "rgba(255, 255, 255, 0.05)",
                                border: "1px solid rgba(255, 255, 255, 0.15)",
                                borderRadius: "12px",
                                padding: "1.2rem 1.5rem",
                                cursor: "pointer",
                                transition: "all 0.3s ease",
                                textAlign: "left",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = "rgba(189, 142, 72, 0.1)";
                                e.currentTarget.style.borderColor = "var(--color-gold-start)";
                                e.currentTarget.style.transform = "translateY(-2px)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
                                e.currentTarget.style.transform = "translateY(0)";
                            }}
                        >
                            <div>
                                <h3
                                    style={{
                                        fontSize: "1.1rem",
                                        color: "var(--color-white)",
                                        marginBottom: "0.3rem",
                                        fontWeight: 600,
                                    }}
                                >
                                    {account.name}
                                </h3>
                                <p
                                    style={{
                                        fontSize: "0.85rem",
                                        color: "rgba(255, 255, 255, 0.5)",
                                    }}
                                >
                                    {account.role === "SOCIO" ? "Cuenta Socio" : "Cuenta Personal"}
                                </p>
                            </div>

                            {/* Icono de flecha */}
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="var(--color-gold-start)"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                        </button>
                    ))}
                </div>

                <div
                    className="auth-footer"
                    style={{ marginTop: "2rem", fontSize: "0.85rem" }}
                >
                    ¿Necesitas ayuda?{" "}
                    <a
                        href="/dashboard/soporte"
                        style={{
                            color: "var(--color-gold-start)",
                            textDecoration: "underline",
                            cursor: "pointer",
                        }}
                    >
                        Contactar Soporte
                    </a>
                </div>
            </div>
        </div>
    );
}
