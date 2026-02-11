"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";

export type AccountRole = "USER" | "SOCIO";

export interface Account {
    id: string;
    name: string;
    userId: string;
    role: AccountRole;
    createdAt?: string;
}

interface AccountContextValue {
    accounts: Account[];
    activeAccount: Account | null;
    isLoading: boolean;
    setActiveAccount: (accountId: string) => void;
    clearActiveAccount: () => void;
}

const AccountContext = createContext<AccountContextValue | undefined>(undefined);

interface AccountProviderProps {
    children: React.ReactNode;
}

export function AccountProvider({ children }: AccountProviderProps) {
    // CORRECCIÓN: Aseguramos la desestructuración limpia de status
    const { data: session, status } = useSession();

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // ================================================================
    // EFECTO 1: Fetch de cuentas cuando hay sesión
    // ================================================================
    useEffect(() => {
        const fetchAccounts = async () => {
            // 1. Si aún está cargando la sesión de NextAuth, detenemos y esperamos
            if (status === "loading") {
                setIsLoading(true);
                return;
            }

            // 2. Si no hay sesión o el status es no autenticado, limpiamos y salimos
            if (status === "unauthenticated" || !session?.user?.id) {
                setAccounts([]);
                setActiveAccountId(null);
                localStorage.removeItem("activeAccountId");
                setIsLoading(false);
                return;
            }

            // 3. Flujo de carga de cuentas (Autenticado)
            setIsLoading(true);

            try {
                // Simulación de latencia de red (800ms)
                await new Promise((resolve) => setTimeout(resolve, 800));

                const mockAccounts: Account[] = [
                    { id: "acc-user-1", name: "Cuenta Personal", userId: session.user.id, role: "USER" },
                    { id: "acc-socio-1", name: "Cuenta Socio Premium", userId: session.user.id, role: "SOCIO" }
                ];


                setAccounts(mockAccounts);

                // Restaurar última cuenta usada
                const savedAccountId = localStorage.getItem("activeAccountId");
                if (savedAccountId) {
                    const savedAccount = mockAccounts.find(
                        (acc) => acc.id === savedAccountId && acc.userId === session.user.id
                    );

                    if (savedAccount) {
                        setActiveAccountId(savedAccountId);
                    } else {
                        localStorage.removeItem("activeAccountId");
                        setActiveAccountId(null);
                    }
                }
            } catch (error) {
                console.error("Error fetching accounts:", error);
                setAccounts([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAccounts();
        // Agregamos status y session.user.id como dependencias críticas
    }, [session?.user?.id, status]);

    // ================================================================
    // EFECTO 2: Auto-limpieza al cerrar sesión
    // ================================================================
    useEffect(() => {
        if (status === "unauthenticated") {
            setAccounts([]);
            setActiveAccountId(null);
            localStorage.removeItem("activeAccountId");
        }
    }, [status]);

    const setActiveAccount = useCallback(
        (accountId: string) => {
            const account = accounts.find(
                (acc) => acc.id === accountId && acc.userId === session?.user?.id
            );

            if (!account) {
                console.error("Intento de seleccionar cuenta inválida:", accountId);
                return;
            }

            localStorage.setItem("activeAccountId", accountId);
            setActiveAccountId(accountId);
            console.log(`✅ Cuenta activa establecida: ${account.name} (${account.role})`);
        },
        [accounts, session?.user?.id]
    );

    const clearActiveAccount = useCallback(() => {
        localStorage.removeItem("activeAccountId");
        setActiveAccountId(null);
        console.log("🗑️ Cuenta activa limpiada");
    }, []);

    const activeAccount = useMemo(() => {
        if (!activeAccountId) return null;
        return accounts.find((acc) => acc.id === activeAccountId) || null;
    }, [activeAccountId, accounts]);

    const value = useMemo(
        () => ({
            accounts,
            activeAccount,
            isLoading,
            setActiveAccount,
            clearActiveAccount,
        }),
        [accounts, activeAccount, isLoading, setActiveAccount, clearActiveAccount]
    );

    return (
        <AccountContext.Provider value={value}>
            {children}
        </AccountContext.Provider>
    );
}

export function useAccount() {
    const context = useContext(AccountContext);
    if (context === undefined) {
        throw new Error("useAccount debe ser usado dentro de un AccountProvider.");
    }
    return context;
}