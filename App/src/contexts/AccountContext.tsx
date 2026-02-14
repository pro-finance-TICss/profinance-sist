"use client";

// ============================================================================
// CONTEXTO DE CUENTAS FINANCIERAS ("CAJITAS") - PRO-FINANCE
// ============================================================================
// Gestiona el estado de las cuentas del usuario actual.
// Provee funciones para cargar, seleccionar y crear cuentas.
// Persiste la cuenta activa en localStorage para mantener la selección.
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";

// ============================================================================
// TIPOS
// ============================================================================

/// Roles válidos para una cuenta
export type AccountRole = "USER" | "SOCIO";

/// Estructura de una cuenta financiera ("cajita")
export interface Account {
    id: string;
    name: string;
    userId: string;
    role: AccountRole;
    investedCapital: number;
    withdrawalLimitByDate: number | null;
    createdAt?: string;
}

/// Valor expuesto por el contexto
interface AccountContextValue {
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
    const [isLoading, setIsLoading] = useState(true);

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
            console.error("❌ Error cargando cuentas:", error);
            setAccounts([]);
            return [];
        }
    }, []);

    // ================================================================
    // EFECTO: Carga inicial de cuentas cuando hay sesión
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
                localStorage.removeItem("activeAccountId");
                setIsLoading(false);
                return;
            }

            // Autenticado: cargar cuentas
            setIsLoading(true);

            const validAccounts = await loadAccounts(session.user.id);

            // Restaurar cuenta guardada en localStorage
            const savedAccountId = localStorage.getItem("activeAccountId");
            if (savedAccountId) {
                const savedAccount = validAccounts.find(
                    (acc) => acc.id === savedAccountId && acc.userId === session.user.id
                );

                if (savedAccount) {
                    setActiveAccountId(savedAccountId);
                } else {
                    // Cuenta guardada no es válida, limpiar
                    localStorage.removeItem("activeAccountId");
                    setActiveAccountId(null);
                }
            }

            setIsLoading(false);
        };

        initAccounts();
    }, [session?.user?.id, status, loadAccounts]);

    // ================================================================
    // Limpieza al cerrar sesión
    // ================================================================
    useEffect(() => {
        if (status === "unauthenticated") {
            setAccounts([]);
            setActiveAccountId(null);
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
                console.error("❌ Intento de seleccionar cuenta inválida:", accountId);
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
                console.error("❌ Error creando cajita:", error);
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
            await loadAccounts(session.user.id);
        }
    }, [session?.user?.id, loadAccounts]);

    // ================================================================
    // Derivar cuenta activa desde el ID
    // ================================================================
    const activeAccount = useMemo(() => {
        if (!activeAccountId) return null;
        return accounts.find((acc) => acc.id === activeAccountId) || null;
    }, [activeAccountId, accounts]);

    // ================================================================
    // Valor del contexto (memoizado para evitar renders innecesarios)
    // ================================================================
    const value = useMemo(
        () => ({
            accounts,
            activeAccount,
            isLoading,
            setActiveAccount,
            clearActiveAccount,
            createAccount,
            refreshAccounts,
        }),
        [accounts, activeAccount, isLoading, setActiveAccount, clearActiveAccount, createAccount, refreshAccounts]
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
        throw new Error("useAccount debe ser usado dentro de un AccountProvider.");
    }
    return context;
}