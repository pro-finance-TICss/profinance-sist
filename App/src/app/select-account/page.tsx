"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@/contexts/AccountContext";

/**
 * Página de selección de cuenta - Versión Centrada (CSS-First)
 */
export default function SelectAccountPage() {
    const { accounts, activeAccount, setActiveAccount, isLoading } = useAccount();
    const router = useRouter();

    // GUARD: Redirigir si ya hay cuenta activa
    useEffect(() => {
        if (!isLoading && activeAccount) {
            router.replace("/dashboard");
        }
    }, [activeAccount, isLoading, router]);

    // AUTO-SELECCIÓN: Si solo hay 1 cuenta
    useEffect(() => {
        if (!isLoading && accounts.length === 1 && !activeAccount) {
            setActiveAccount(accounts[0].id);
            router.replace("/dashboard");
        }
    }, [accounts, isLoading, activeAccount, setActiveAccount, router]);

    const handleSelectAccount = (accountId: string) => {
        setActiveAccount(accountId);
        router.replace("/dashboard");
    };

    // RENDER: Loading (Mantenemos el spinner centrado)
    if (isLoading) {
        return (
            <div className="selector-container">
                <div className="auth-card" style={{ border: 'none', boxShadow: 'none' }}>
                    <div className="loading-spinner" /> {/* Clase sugerida para globals.css */}
                    <p style={{ color: "rgba(255, 255, 255, 0.7)", marginTop: "1rem" }}>
                        Cargando cuentas...
                    </p>
                </div>
                <style jsx>{`
                    .loading-spinner {
                        width: 50px; height: 50px;
                        border: 4px solid rgba(189, 142, 72, 0.2);
                        border-top: 4px solid var(--color-gold-start);
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin { 100% { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    // RENDER PRINCIPAL: Selección de cuenta o Onboarding
    return (
        /* CLAVE: Usamos selector-container para centrado absoluto via Flexbox en globals.css */
        <main className="selector-container">

            {/* 1. HEADER CENTRADO */}
            <header className="auth-header">
                <h1 className="company-name">
                    {accounts.length === 0 ? "BIENVENIDO" : "SELECCIONA TU CUENTA"}
                </h1>
                <p className="auth-footer" style={{ marginTop: "0.5rem" }}>
                    {accounts.length === 0
                        ? "Aún no tienes cuentas configuradas"
                        : "Elige la cuenta con la que deseas operar"}
                </p>
            </header>

            {/* 2. GRID DE CUENTAS O MENSJA DE ONBOARDING */}
            <div className="account-grid">
                {accounts.length === 0 ? (
                    /* Caso: 0 Cuentas */
                    <div className="auth-card" style={{ backdropFilter: "blur(10px)", width: '100%' }}>
                        <p style={{ color: "rgba(255, 255, 255, 0.6)", textAlign: 'center', marginBottom: '2rem' }}>
                            Por favor, contacta con soporte para activar tu acceso.
                        </p>
                        <button className="btn-primary" onClick={() => router.replace("/dashboard/soporte")}>
                            <span className="btn-text">Contactar Soporte</span>
                        </button>
                    </div>
                ) : (
                    /* Caso: Múltiples Cuentas */
                    accounts.map((account) => (
                        <button
                            key={account.id}
                            className="auth-card"
                            onClick={() => handleSelectAccount(account.id)}
                            style={{
                                cursor: "pointer",
                                width: "100%",
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                padding: '1.5rem 2rem',
                                backdropFilter: "blur(12px)"
                            }}
                        >
                            <div style={{ textAlign: 'left' }}>
                                <h3 style={{ fontSize: "1.2rem", color: "var(--color-white)", marginBottom: "0.2rem" }}>
                                    {account.name}
                                </h3>
                                <span style={{ fontSize: "0.8rem", color: "var(--color-gold-start)", opacity: 0.8 }}>
                                    {account.role === "SOCIO" ? "CUENTA SOCIO" : "CUENTA PERSONAL"}
                                </span>
                            </div>
                            <span style={{ fontSize: '1.5rem', color: 'var(--color-gold-start)' }}>→</span>
                        </button>
                    ))
                )}
            </div>

            {/* 3. FOOTER DE AYUDA */}
            <footer className="auth-footer" style={{ marginTop: "3rem" }}>
                ¿Necesitas ayuda?{" "}
                <a href="/dashboard/soporte">CONTACTAR SOPORTE</a>
            </footer>

        </main>
    );
}
