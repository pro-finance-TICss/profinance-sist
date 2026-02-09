// ============================================================================
// CURRENCY CONTEXT - PRO-FINANCE
// ============================================================================
// Context global para manejar la moneda preferida del usuario y tasas de cambio

"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface ExchangeRates {
  [key: string]: number;
}

interface CurrencyContextType {
  baseCurrency: string;           // User's base currency (immutable for users)
  displayCurrency: string;        // Currency for display (user can change)
  setCurrency: (currency: string) => void;
  isConvertedView: boolean;       // true if displaying in non-base currency
  exchangeRates: ExchangeRates;
  convertAmount: (amount: number, from?: string) => number;
  formatAmount: (amount: number, showSymbol?: boolean) => string;
  isLoading: boolean;
  currency: string; // Alias for displayCurrency for backward compatibility
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined
);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { data: session, update: updateSession } = useSession();
  
  // Base Currency (Default COP for everyone per requirement)
  const [baseCurrency, setBaseCurrency] = useState<string>("COP");
  
  // Display Currency (Default USD)
  const [displayCurrency, setDisplayCurrency] = useState<string>("USD");
  
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({ USD: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Sync with session data
  useEffect(() => {
    if (session?.user && !isInitialized) {
      const user = session.user as any;
      
      // Set base currency from session or default to COP
      if (user.baseCurrency) {
        setBaseCurrency(user.baseCurrency);
      }
      
      // Set display currency from session or default to USD
      if (user.preferredCurrency) {
        setDisplayCurrency(user.preferredCurrency);
      }
      
      setIsInitialized(true);
    }
    // Always stop loading after attempt to read session
    if (session !== undefined) {
      setIsLoading(false);
    }
  }, [session, isInitialized]);

  // Load exchange rates
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch("/api/exchange-rates");
        const data = await res.json();
        if (data.success && data.rates) {
          setExchangeRates(data.rates);
        }
      } catch (error) {
        console.error("Error fetching exchange rates:", error);
      }
    };

    fetchRates();
    const interval = setInterval(fetchRates, 30 * 60 * 1000); // 30 minutes
    return () => clearInterval(interval);
  }, []);

  // Update display currency
  const setCurrency = async (newCurrency: string) => {
    setDisplayCurrency(newCurrency);

    try {
      const res = await fetch("/api/user/update-currency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: newCurrency }),
      });

      if (res.ok) {
        updateSession();
      }
    } catch (error) {
      console.error("Error updating currency preference:", error);
    }
  };

  /**
   * Convert amount from source currency to DISPLAY currency.
   * Default source is BASE currency.
   */
  const convertAmount = (amount: number, fromCurrency?: string): number => {
    // If no info yet, return same amount
    if (Object.keys(exchangeRates).length <= 1 && amount !== 0) return amount;

    const sourceCurrency = fromCurrency || baseCurrency;
    
    // If source matches display, no conversion needed
    if (sourceCurrency === displayCurrency) return amount;

    // 1. Convert source to USD
    // If source is USD, rate is 1. Else divide by rate (e.g. amountInCOP / rateCOPtoUSD)
    // Wait, API returns rates relative to USD (USD = 1).
    // So 1 USD = X COP. To go COP -> USD, we divide by Rate(COP).
    const amountInUSD =
      sourceCurrency === "USD"
        ? amount
        : amount / (exchangeRates[sourceCurrency] || 1);

    // 2. Convert USD to Display Currency
    // Multiply by Rate(Display)
    const rate = exchangeRates[displayCurrency] || 1;
    return amountInUSD * rate;
  };

  const formatAmount = (amount: number, showSymbol = true): string => {
    // Only convert if we are formatting a value that is inherently in base currency
    // Use convertAmount with defaults (from Base to Display)
    const converted = convertAmount(amount);

    const formatConfigs: Record<string, { locale: string; currency: string }> = {
      USD: { locale: "en-US", currency: "USD" },
      COP: { locale: "es-CO", currency: "COP" },
      EUR: { locale: "de-DE", currency: "EUR" },
      MXN: { locale: "es-MX", currency: "MXN" },
      GBP: { locale: "en-GB", currency: "GBP" },
    };

    const config = formatConfigs[displayCurrency] || formatConfigs.USD;

    const formatter = new Intl.NumberFormat(config.locale, {
      style: showSymbol ? "currency" : "decimal",
      currency: config.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return formatter.format(converted);
  };

  return (
    <CurrencyContext.Provider
      value={{
        baseCurrency,
        displayCurrency,
        currency: displayCurrency, // Alias
        setCurrency, // Updates display currency
        isConvertedView: baseCurrency !== displayCurrency,
        exchangeRates,
        convertAmount,
        formatAmount,
        isLoading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
