"use client";

// ============================================================================
// PÁGINA: SELECCIÓN DE CUENTA ("CAJITA") - PRO-FINANCE
// ============================================================================
// Muestra las cuentas del usuario y permite seleccionar una para operar.
// También permite crear nuevas cajitas con nombre personalizado.
// Si solo hay 1 cuenta, redirige automáticamente al dashboard.
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAccount } from "@/contexts/AccountContext";

export default function SelectAccountPage() {
    const { accounts, activeAccount, setActiveAccount, clearActiveAccount, createAccount, isLoading } = useAccount();
    const { data: session } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isSwitching = searchParams.get("switch") === "true";

    // Determinar ruta de destino según el rol del usuario
    const getRedirectPath = useCallback(() => {
        const role = session?.user?.role;
        if (role === "SUPER_ADMIN") return "/superadmin";
        if (role === "ADMIN") return "/admin";
        return "/dashboard";
    }, [session]);

    // Estado para crear nueva cajita
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newAccountName, setNewAccountName] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // Al entrar en modo switch, limpiar la cuenta activa
    useEffect(() => {
        if (isSwitching) {
            clearActiveAccount();
        }
    }, [isSwitching, clearActiveAccount]);

    // GUARD: Redirigir si ya hay cuenta activa (solo si NO estamos en modo switch)
    useEffect(() => {
        if (!isSwitching && !isLoading && activeAccount) {
            router.replace(getRedirectPath());
        }
    }, [activeAccount, isLoading, router, getRedirectPath, isSwitching]);

    // AUTO-SELECCIÓN: Si solo hay 1 cuenta, seleccionarla automáticamente (solo si NO estamos en modo switch)
    useEffect(() => {
        if (!isSwitching && !isLoading && accounts.length === 1 && !activeAccount) {
            setActiveAccount(accounts[0].id);
            router.replace(getRedirectPath());
        }
    }, [accounts, isLoading, activeAccount, setActiveAccount, router, getRedirectPath, isSwitching]);

    // Seleccionar una cuenta y navegar al panel correspondiente
    const handleSelectAccount = useCallback((accountId: string) => {
        setActiveAccount(accountId);
        router.replace(getRedirectPath());
    }, [setActiveAccount, router, getRedirectPath]);

    // Crear nueva cajita
    const handleCreateAccount = useCallback(async () => {
        if (!newAccountName.trim()) return;

        setIsCreating(true);
        setCreateError(null);

        try {
            const account = await createAccount(newAccountName.trim());
            if (account) {
                setNewAccountName("");
                setShowCreateForm(false);
                // Seleccionar la nueva cuenta automáticamente
                setActiveAccount(account.id);
                router.replace(getRedirectPath());
            }
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Error desconocido";
            setCreateError(msg);
        } finally {
            setIsCreating(false);
        }
    }, [newAccountName, createAccount, setActiveAccount, router]);

    // Estado de carga
    if (isLoading) {
        return (
            <div className="selector-container">
                <div className="auth-card" style={{ border: "none", boxShadow: "none" }}>
                    <div style={spinnerStyle} />
                    <p style={{ color: "rgba(255, 255, 255, 0.7)", marginTop: "1rem" }}>
                        Cargando cuentas...
                    </p>
                </div>
                <style>{KEYFRAMES_CSS}</style>
            </div>
        );
    }

    // Render principal
    return (
        <main className="selector-container">
            {/* Encabezado */}
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

            {/* Grid de cuentas */}
            <div className="account-grid">
                {accounts.length === 0 ? (
                    /* Sin cuentas: mostrar formulario de creación */
                    <div className="auth-card" style={emptyCardStyle}>
                        <p style={{ color: "rgba(255, 255, 255, 0.6)", textAlign: "center", marginBottom: "1.5rem" }}>
                            Crea tu primera cajita para comenzar a operar.
                        </p>
                        <CreateAccountForm
                            name={newAccountName}
                            setName={setNewAccountName}
                            onCreate={handleCreateAccount}
                            isCreating={isCreating}
                            error={createError}
                        />
                    </div>
                ) : (
                    /* Múltiples cuentas */
                    <>
                        {accounts.map((account) => (
                            <button
                                key={account.id}
                                className="auth-card"
                                onClick={() => handleSelectAccount(account.id)}
                                style={accountButtonStyle}
                            >
                                <div style={{ textAlign: "left" }}>
                                    <h3 style={{ fontSize: "1.2rem", color: "var(--color-white)", marginBottom: "0.2rem" }}>
                                        {account.name}
                                    </h3>
                                    <span style={{ fontSize: "0.8rem", color: "var(--color-gold-start)", opacity: 0.8 }}>
                                        {account.role === "SOCIO" ? "CUENTA SOCIO" : "CUENTA PERSONAL"}
                                    </span>
                                </div>
                                <span style={{ fontSize: "1.5rem", color: "var(--color-gold-start)" }}>→</span>
                            </button>
                        ))}

                        {/* Botón para crear nueva cajita */}
                        {!showCreateForm ? (
                            <button
                                className="auth-card"
                                onClick={() => setShowCreateForm(true)}
                                style={createButtonStyle}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <span style={plusIconStyle}>+</span>
                                    <span style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "1rem" }}>
                                        Crear nueva cajita
                                    </span>
                                </div>
                            </button>
                        ) : (
                            <div className="auth-card" style={emptyCardStyle}>
                                <CreateAccountForm
                                    name={newAccountName}
                                    setName={setNewAccountName}
                                    onCreate={handleCreateAccount}
                                    isCreating={isCreating}
                                    error={createError}
                                    onCancel={() => {
                                        setShowCreateForm(false);
                                        setNewAccountName("");
                                        setCreateError(null);
                                    }}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer de ayuda */}
            <footer className="auth-footer" style={{ marginTop: "3rem" }}>
                ¿Necesitas ayuda?{" "}
                <a href="/dashboard/soporte">CONTACTAR SOPORTE</a>
            </footer>

            <style>{KEYFRAMES_CSS}</style>
        </main>
    );
}

// ============================================================================
// COMPONENTE: Formulario para crear nueva cajita
// ============================================================================

interface CreateAccountFormProps {
    name: string;
    setName: (name: string) => void;
    onCreate: () => void;
    isCreating: boolean;
    error: string | null;
    onCancel?: () => void;
}

function CreateAccountForm({ name, setName, onCreate, isCreating, error, onCancel }: CreateAccountFormProps) {
    return (
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre de la cajita (ej: Ahorros, Inversiones)"
                maxLength={50}
                style={inputStyle}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !isCreating) onCreate();
                }}
                disabled={isCreating}
                autoFocus
            />
            {error && (
                <p style={{ color: "#ff6b6b", fontSize: "0.85rem", margin: 0 }}>
                    {error}
                </p>
            )}
            <div style={{ display: "flex", gap: "8px" }}>
                <button
                    className="btn-primary"
                    onClick={onCreate}
                    disabled={isCreating || !name.trim()}
                    style={{ flex: 1, opacity: isCreating || !name.trim() ? 0.5 : 1 }}
                >
                    <span className="btn-text">
                        {isCreating ? "Creando..." : "Crear Cajita"}
                    </span>
                </button>
                {onCancel && (
                    <button
                        onClick={onCancel}
                        disabled={isCreating}
                        style={cancelButtonStyle}
                    >
                        Cancelar
                    </button>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// ESTILOS ESTÁTICOS (fuera del componente para evitar recreación en cada render)
// ============================================================================

const KEYFRAMES_CSS = `
@keyframes spin { 100% { transform: rotate(360deg); } }
`;

const spinnerStyle: React.CSSProperties = {
    width: 50,
    height: 50,
    border: "4px solid rgba(189, 142, 72, 0.2)",
    borderTop: "4px solid var(--color-gold-start)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
};

const emptyCardStyle: React.CSSProperties = {
    width: "100%",
    padding: "2rem",
};

const accountButtonStyle: React.CSSProperties = {
    cursor: "pointer",
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: "1.5rem 2rem",
};

const createButtonStyle: React.CSSProperties = {
    cursor: "pointer",
    width: "100%",
    padding: "1.2rem 2rem",
    border: "1px dashed rgba(189, 142, 72, 0.4)",
    background: "rgba(189, 142, 72, 0.05)",
};

const plusIconStyle: React.CSSProperties = {
    fontSize: "1.5rem",
    color: "var(--color-gold-start)",
    fontWeight: "bold",
    width: "32px",
    height: "32px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    background: "rgba(189, 142, 72, 0.15)",
};

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1px solid rgba(189, 142, 72, 0.3)",
    background: "rgba(255, 255, 255, 0.05)",
    color: "#fff",
    fontSize: "1rem",
    outline: "none",
};

const cancelButtonStyle: React.CSSProperties = {
    padding: "10px 20px",
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    background: "transparent",
    color: "rgba(255, 255, 255, 0.6)",
    cursor: "pointer",
    fontSize: "0.9rem",
};
