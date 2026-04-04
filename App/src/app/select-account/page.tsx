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
import { formatCurrency, decimalToNumber } from "@/lib/utils/currency";
import { Wallet, ShieldCheck, Briefcase, ArrowRight, History, TrendingUp } from "lucide-react";

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
                <h1 className="company-name" style={{ fontSize: "2.5rem" }}>
                    {accounts.length === 0 ? "BIENVENIDO" : "TUS CUENTAS"}
                </h1>
                <p className="auth-footer" style={{ marginTop: "0.5rem", fontSize: "1rem" }}>
                    {accounts.length === 0
                        ? "Aún no tienes cuentas configuradas"
                        : "Selecciona una cuenta para operar"}
                </p>
            </header>

            {/* Grid de cuentas */}
            <div className="account-grid">
                {accounts.length === 0 ? (
                    /* Sin cuentas: mostrar formulario de creación */
                    <div className="auth-card" style={emptyCardStyle}>
                        <p style={{ color: "rgba(255, 255, 255, 0.6)", textAlign: "center", marginBottom: "1.5rem" }}>
                            Crea tu primera Cuenta de Inversión para comenzar a operar.
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
                        {accounts.map((account) => {
                            const isSocio = account.role === "SOCIO";
                            const balance = decimalToNumber(account.investedCapital);
                            
                            return (
                                <div
                                    key={account.id}
                                    className="auth-card"
                                    style={accountCardStyle}
                                >
                                    {/* CABECERA TARJETA */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <div style={{
                                                padding: "8px",
                                                borderRadius: "10px",
                                                backgroundColor: isSocio ? "rgba(59, 130, 246, 0.1)" : "rgba(16, 185, 129, 0.1)",
                                                color: isSocio ? "#3b82f6" : "#10b981",
                                            }}>
                                                {isSocio ? <Briefcase size={20} /> : <Wallet size={20} />}
                                            </div>
                                            <div>
                                                <h3 style={{ fontSize: "1.1rem", color: "var(--color-white)", margin: 0, fontWeight: 600 }}>
                                                    {account.name}
                                                </h3>
                                                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>
                                                    <History size={12} />
                                                    <span>01-24</span> {/* Placeholder fecha o ID corto */}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <span style={{ 
                                            padding: "4px 8px", 
                                            borderRadius: "6px", 
                                            fontSize: "0.7rem", 
                                            fontWeight: "bold",
                                            textTransform: "uppercase",
                                            backgroundColor: isSocio ? "rgba(59, 130, 246, 0.2)" : "rgba(189, 142, 72, 0.2)",
                                            color: isSocio ? "#60a5fa" : "#bd8e48",
                                            border: `1px solid ${isSocio ? "rgba(59, 130, 246, 0.3)" : "rgba(189, 142, 72, 0.3)"}`
                                        }}>
                                            {isSocio ? "SOCIO" : "USUARIO"}
                                        </span>
                                    </div>

                                    {/* BALANCE */}
                                    <div style={{ marginBottom: "1.5rem" }}>
                                        <p style={{ margin: 0, fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}>
                                            Balance Total
                                        </p>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <h2 style={{ margin: 0, fontSize: "1.8rem", color: "#fff", fontWeight: 700, letterSpacing: "-0.5px" }}>
                                                {formatCurrency(balance)}
                                            </h2>
                                            {isSocio && (
                                                <div style={{ padding: "2px 6px", borderRadius: "4px", backgroundColor: "rgba(16, 185, 129, 0.2)", color: "#10b981", fontSize: "0.75rem", fontWeight: "bold" }}>
                                                    <TrendingUp size={12} style={{ display: "inline", marginRight: "2px" }}/>
                                                    +5.2%
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* ACCIONES */}
                                    <div style={{ marginTop: "auto", display: "flex", gap: "10px" }}>
                                        <button
                                            onClick={() => handleSelectAccount(account.id)}
                                            className="btn-primary"
                                            style={{ margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "0.95rem" }}
                                        >
                                            Seleccionar
                                            <ArrowRight size={16} color="#000" strokeWidth={3} />
                                        </button>
                                        
                                        {/* Botón secundario decorativo (deshabilitado en este contexto) */}
                                        <div 
                                            style={{ 
                                                padding: "0 15px", 
                                                display: "flex", 
                                                alignItems: "center", 
                                                borderRadius: "8px", 
                                                border: "1px solid rgba(255,255,255,0.1)",
                                                cursor: "not-allowed",
                                                opacity: 0.5
                                            }}
                                            title="Detalles (Próximamente)"
                                        >
                                            <ShieldCheck size={18} color="rgba(255,255,255,0.5)" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Botón para crear nueva cajita */}
                        {!showCreateForm ? (
                            <button
                                className="auth-card"
                                onClick={() => setShowCreateForm(true)}
                                style={createCardStyle}
                            >
                                <div style={plusIconCircleStyle}>+</div>
                                <span style={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "1.1rem", fontWeight: "600" }}>
                                    Nueva Cuenta
                                </span>
                                <span style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "0.85rem" }}>
                                    Agrega una nueva cuenta de inversión
                                </span>
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
                placeholder="Nombre de la cuenta (ej: Ahorros, Inversiones)"
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
                        {isCreating ? "Creando..." : "Crear Cuenta"}
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
// ESTILOS ESTÁTICOS
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
    minHeight: "220px", 
    justifyContent: "center",
};

// Nuevo estilo para las tarjetas de cuenta
const accountCardStyle: React.CSSProperties = {
    width: "100%",
    minHeight: "220px",
    display: "flex",
    flexDirection: "column",
    padding: "1.8rem",
    cursor: "default", // El botón interno maneja la acción
    justifyContent: "space-between",
    alignItems: "stretch", // Importante para que el contenido llene el ancho
    textAlign: "left", // Reset del align-center de .auth-card
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
};

const createCardStyle: React.CSSProperties = {
    width: "100%",
    minHeight: "220px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "15px",
    border: "2px dashed rgba(189, 142, 72, 0.3)",
    background: "rgba(189, 142, 72, 0.03)",
    transition: "all 0.3s ease",
};

const plusIconCircleStyle: React.CSSProperties = {
    fontSize: "2rem",
    color: "var(--color-gold-start)",
    width: "60px",
    height: "60px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    background: "rgba(189, 142, 72, 0.1)",
    border: "1px solid rgba(189, 142, 72, 0.3)",
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
