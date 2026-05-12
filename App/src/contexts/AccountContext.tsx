"use client";

// ============================================================================
// CONTEXTO DE CUENTAS FINANCIERAS ("CAJITAS") - PRO-FINANCE
// ============================================================================
// Gestiona el estado de las cuentas del usuario actual.
// Provee funciones para cargar, seleccionar y crear cuentas.
// Persiste la cuenta activa en localStorage para mantener la selección.
//
// FASE 2 — MULTI-ACCOUNT AWARE (SIN BREAKING CHANGES)
// Extiende el contexto original con:
//   - savingsAccount          — cuenta de ahorro derivada
//   - investmentAccounts      — cuentas de inversión derivadas
//   - primaryInvestmentAccount — cuenta de inversión con mayor capital
//   - totalCapital            — capital consolidado desde backend
//   - totalPendingWithdrawals — retiros pendientes desde backend
//   - setViewedAccount        — alias semántico de setActiveAccount
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { logger } from "@/lib/logger";

// ============================================================================
// TIPOS
// ============================================================================

/// Roles válidos para una cuenta
export type AccountRole = "USER" | "SOCIO";

/// Tipos de cuenta
export type AccountType = "SAVINGS" | "INVESTMENT";

/// Estructura de una cuenta financiera ("cajita")
export interface Account {
    id: string;
    name: string;
    userId: string;
    /// Tipo de cuenta: SAVINGS (Ahorro, default) | INVESTMENT (Inversión)
    type: AccountType;
    role: AccountRole;
    /// Si la cuenta de inversión es de Alto Riesgo (AR)
    /// false = cuenta normal → recibe rendimientos targetRole="USER"
    /// true  = cuenta AR     → recibe rendimientos targetRole="SOCIO"
    isHighRisk: boolean;
    investedCapital: number;
    withdrawalLimitByDate: number | null;
    createdAt?: string;
}

/// Valor expuesto por el contexto
interface AccountContextValue {
    // ── EXISTENTE (NO TOCAR) ─────────────────────────────────────────────────
    /// Lista de cuentas del usuario
    accounts: Account[];
    /// Cuenta actualmente seleccionada
    activeAccount: Account | null;
    /// Indica si se están cargando las cuentas
    isLoading: boolean;
    /// Seleccionar una cuenta activa por ID
    setActiveAccount: (accountId: string) => void;
    /// Limpiar la cuenta activa (para logout o cambio de cuenta)
    clearActiveAccount: () => void;
    /// Crear una nueva cajita con nombre personalizado
    createAccount: (name: string) => Promise<Account | null>;
    /// Recargar cuentas desde el servidor
    refreshAccounts: () => Promise<void>;

    // ── NUEVO — DERIVADOS ────────────────────────────────────────────────────
    /// Cuenta de ahorro del usuario (SAVINGS)
    savingsAccount: Account | null;
    /// Cuentas de inversión del usuario (INVESTMENT)
    investmentAccounts: Account[];
    /// Cuenta de inversión con mayor capital invertido
    primaryInvestmentAccount: Account | null;

    // ── NUEVO — AGREGADOS DESDE BACKEND ──────────────────────────────────────
    /// Capital total consolidado de todas las cuentas (viene de /api/wallet/summary)
    totalCapital: number;
    /// Total de retiros pendientes (viene de /api/wallet/summary)
    totalPendingWithdrawals: number;

    // ── NUEVO — ALIAS SEMÁNTICO ──────────────────────────────────────────────
    /// Alias de setActiveAccount con semántica de "ver" una cuenta
    setViewedAccount: (accountId: string) => void;
}

const AccountContext = createContext<AccountContextValue | undefined>(undefined);

interface AccountProviderProps {
    children: React.ReactNode;
}

// ============================================================================
// PROVEEDOR DE CUENTAS
// ============================================================================

export function AccountProvider({ children }: AccountProviderProps) {
    const { data: session, status } = useSession();

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
    useEffect(() => {
        console.log("👁️ activeAccountId:", activeAccountId);
    }, [activeAccountId]);
    const [isLoading, setIsLoading] = useState(true);

    // ── NUEVO — estado para métricas agregadas de backend ───────────────────
    const [totalCapital, setTotalCapital] = useState<number>(0);
    const [totalPendingWithdrawals, setTotalPendingWithdrawals] = useState<number>(0);

    // ================================================================
    // Función interna para cargar cuentas desde la API
    // ================================================================
    const loadAccounts = useCallback(async (userId: string) => {
        try {
            const response = await fetch("/api/accounts", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: Error cargando cuentas`);
            }

            const fetchedAccounts: Account[] = await response.json();

            // Seguridad: verificar que las cuentas pertenezcan al usuario actual
            const validAccounts = fetchedAccounts.filter(
                (acc) => acc.userId === userId
            );

            setAccounts(validAccounts);
            return validAccounts;
        } catch (error) {
            logger.error("❌ Error cargando cuentas:", error);
            setAccounts([]);
            return [];
        }
    }, []);

    // ================================================================
    // NUEVO — Función interna para cargar resumen del wallet desde backend
    // ⚠️ NO recalcula en frontend — consume /api/wallet/summary directamente
    // ================================================================
    const loadWalletSummary = useCallback(async () => {
        try {
            const response = await fetch("/api/wallet/summary", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                logger.error(`[AccountContext] Error cargando wallet/summary: HTTP ${response.status}`);
                return;
            }

            const summary = await response.json();
            setTotalCapital(summary.totalCapital ?? 0);
            setTotalPendingWithdrawals(summary.totalPendingWithdrawals ?? 0);
        } catch (error) {
            logger.error("[AccountContext] Error en loadWalletSummary:", error);
        }
    }, []);

    // ================================================================
    // EFECTO: Carga inicial de cuentas + wallet summary cuando hay sesión
    // ⚠️ loadWalletSummary se dispara aquí (mismo efecto) para evitar
    //    re-renders infinitos por dependencias cruzadas
    // ================================================================
    useEffect(() => {
        const initAccounts = async () => {
            // Aún cargando sesión de NextAuth
            if (status === "loading") {
                setIsLoading(true);
                return;
            }

            // No autenticado: limpiar todo
            if (status === "unauthenticated" || !session?.user?.id) {
                setAccounts([]);
                setActiveAccountId(null);
                setTotalCapital(0);
                setTotalPendingWithdrawals(0);
                localStorage.removeItem("activeAccountId");
                setIsLoading(false);
                return;
            }

            // Autenticado: cargar cuentas y resumen consolidado en paralelo
            setIsLoading(true);

            const [validAccounts] = await Promise.all([
                loadAccounts(session.user.id),
                loadWalletSummary(),
            ]);

            if (process.env.NODE_ENV === "development") {
                const savings = validAccounts.filter(acc => acc.type === "SAVINGS");
                const investments = validAccounts.filter(acc => acc.type === "INVESTMENT");
                console.log("[AccountContext] Accounts:", validAccounts.length);
                console.log("[AccountContext] Savings:", savings[0]?.id);
                console.log("[AccountContext] Investments:", investments.length);
            }

            // FASE 3: Limpiar persistencia legacy de activeAccountId.
            // En la nueva arquitectura multi-cuenta el dashboard muestra todas
            // las cuentas sin requerir una cuenta activa seleccionada.
            localStorage.removeItem("activeAccountId");
            setActiveAccountId(null);

            setIsLoading(false);
        };

        initAccounts();
    }, [session?.user?.id, status, loadAccounts, loadWalletSummary]);

    // ================================================================
    // Limpieza al cerrar sesión
    // ================================================================
    useEffect(() => {
        if (status === "unauthenticated") {
            setAccounts([]);
            setActiveAccountId(null);
            setTotalCapital(0);
            setTotalPendingWithdrawals(0);
            localStorage.removeItem("activeAccountId");
        }
    }, [status]);

    // ================================================================
    // Seleccionar cuenta activa
    // ================================================================
    const setActiveAccount = useCallback(
        (accountId: string) => {
            const account = accounts.find(
                (acc) => acc.id === accountId && acc.userId === session?.user?.id
            );

            if (!account) {
                // FASE 3: setActiveAccount es opcional en la nueva arquitectura.
                // No loguear error — el dashboard opera sin cuenta activa obligatoria.
                return;
            }

            localStorage.setItem("activeAccountId", accountId);
            setActiveAccountId(accountId);
        },
        [accounts, session?.user?.id]
    );

    // ================================================================
    // Limpiar cuenta activa
    // ================================================================
    const clearActiveAccount = useCallback(() => {
        localStorage.removeItem("activeAccountId");
        setActiveAccountId(null);
    }, []);

    // ================================================================
    // Crear nueva cajita
    // ================================================================
    const createAccount = useCallback(
        async (name: string): Promise<Account | null> => {
            try {
                const response = await fetch("/api/accounts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || "Error creando cuenta");
                }

                const newAccount: Account = await response.json();

                // Agregar la nueva cuenta al estado local
                setAccounts((prev) => [...prev, newAccount]);

                return newAccount;
            } catch (error) {
                logger.error("❌ Error creando cajita:", error);
                throw error; // Propagar para que el componente muestre el error
            }
        },
        []
    );

    // ================================================================
    // Recargar cuentas desde el servidor
    // ================================================================
    const refreshAccounts = useCallback(async () => {
        if (session?.user?.id) {
            await Promise.all([
                loadAccounts(session.user.id),
                loadWalletSummary(),
            ]);
        }
    }, [session?.user?.id, loadAccounts, loadWalletSummary]);

    // ================================================================
    // Derivar cuenta activa desde el ID
    // ================================================================
    const activeAccount = useMemo(() => {
        if (!activeAccountId) return null;
        return accounts.find((acc) => acc.id === activeAccountId) || null;
    }, [activeAccountId, accounts]);

    // ================================================================
    // NUEVO — Derivar cuentas por tipo
    // ================================================================
    const savingsAccount = useMemo(
        () => accounts.find((acc) => acc.type === "SAVINGS") ?? null,
        [accounts]
    );

    const investmentAccounts = useMemo(
        () => accounts.filter((acc) => acc.type === "INVESTMENT"),
        [accounts]
    );

    const primaryInvestmentAccount = useMemo(() => {
        if (investmentAccounts.length === 0) return null;
        return investmentAccounts.reduce((max, acc) =>
            acc.investedCapital > max.investedCapital ? acc : max
        );
    }, [investmentAccounts]);


    // ================================================================
    // NUEVO — Alias semántico (NO elimina setActiveAccount)
    // ================================================================
    const setViewedAccount = setActiveAccount;

    // ================================================================
    // Valor del contexto (memoizado para evitar renders innecesarios)
    // ================================================================
    const value = useMemo(
        () => ({
            // Existente
            accounts,
            activeAccount,
            isLoading,
            setActiveAccount,
            clearActiveAccount,
            createAccount,
            refreshAccounts,
            // Nuevo — derivados
            savingsAccount,
            investmentAccounts,
            primaryInvestmentAccount,
            // Nuevo — agregados backend
            totalCapital,
            totalPendingWithdrawals,
            // Nuevo — alias semántico
            setViewedAccount,
        }),
        [
            accounts,
            activeAccount,
            isLoading,
            setActiveAccount,
            clearActiveAccount,
            createAccount,
            refreshAccounts,
            savingsAccount,
            investmentAccounts,
            primaryInvestmentAccount,
            totalCapital,
            totalPendingWithdrawals,
            setViewedAccount,
        ]
    );

    return (
        <AccountContext.Provider value={value}>
            {children}
        </AccountContext.Provider>
    );
}

// ============================================================================
// HOOK DE ACCESO AL CONTEXTO
// ============================================================================

export function useAccount() {
    const context = useContext(AccountContext);

    if (context === undefined) {
        // Evita crash durante prerender (_global-error)
        return {
            // Existente
            accounts: [],
            activeAccount: null,
            isLoading: false,
            setActiveAccount: () => { },
            clearActiveAccount: () => { },
            createAccount: async () => null,
            refreshAccounts: async () => { },
            // Nuevo — derivados
            savingsAccount: null,
            investmentAccounts: [],
            primaryInvestmentAccount: null,
            // Nuevo — agregados backend
            totalCapital: 0,
            totalPendingWithdrawals: 0,
            // Nuevo — alias semántico
            setViewedAccount: () => { },
        };
    }

    return context;
}
