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
                // ================================================================
                // FETCH REAL A /api/accounts (Adapter Pattern)
                // ================================================================
                console.log("🔄 Fetching cuentas desde /api/accounts...");

                const response = await fetch("/api/accounts", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const fetchedAccounts: Account[] = await response.json();

                // Validar que las cuentas pertenezcan al usuario actual
                const validAccounts = fetchedAccounts.filter(
                    (acc) => acc.userId === session.user.id
                );

                if (validAccounts.length === 0) {
                    console.warn("⚠️ No se encontraron cuentas válidas para el usuario");
                    setAccounts([]);
                    setIsLoading(false);
                    return;
                }

                setAccounts(validAccounts);
                console.log(`✅ ${validAccounts.length} cuenta(s) cargada(s):`, validAccounts);

                // ================================================================
                // RESTAURAR ÚLTIMA CUENTA USADA (si existe y es válida)
                // ================================================================
                const savedAccountId = localStorage.getItem("activeAccountId");
                if (savedAccountId) {
                    // Validar que la cuenta guardada pertenezca al usuario actual
                    const savedAccount = validAccounts.find(
                        (acc) => acc.id === savedAccountId && acc.userId === session.user.id
                    );

                    if (savedAccount) {
                        setActiveAccountId(savedAccountId);
                        console.log(`🔄 Cuenta restaurada desde localStorage: ${savedAccount.name}`);
                    } else {
                        // Cuenta guardada no válida, limpiar
                        console.warn("⚠️ activeAccountId en localStorage no es válido, limpiando...");
                        localStorage.removeItem("activeAccountId");
                        setActiveAccountId(null);
                    }
                }

                // Éxito: Establecer isLoading=false
                setIsLoading(false);

            } catch (error) {
                console.error("❌ Error fetching accounts:", error);

                // FALLBACK SEGURO: No romper la aplicación
                setAccounts([]);

                // Mantener isLoading=true para evitar redirecciones prematuras
                // Después de 5 segundos, permitir que el usuario vea el mensaje de error
                setTimeout(() => {
                    setIsLoading(false);
                }, 5000);
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