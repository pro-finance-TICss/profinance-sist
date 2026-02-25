// ============================================================================
// CONTEXTO DE MONEDA - PRO-FINANCE
// ============================================================================
// Contexto global para manejar la moneda preferida del usuario y tasas de cambio.

"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { logger } from "@/lib/logger";

/** Tasas de cambio: clave = código de moneda, valor = tasa respecto a USD */
interface ExchangeRates {
  [key: string]: number;
}

/** Tipo del contexto de moneda que se comparte globalmente */
interface CurrencyContextType {
  /** Moneda base del usuario (inmutable para usuarios regulares) */
  baseCurrency: string;
  /** Moneda de visualización (el usuario puede cambiarla) */
  displayCurrency: string;
  /** Función para cambiar la moneda de visualización */
  setCurrency: (currency: string) => void;
  /** true si se está mostrando en una moneda diferente a la base */
  isConvertedView: boolean;
  /** Tasas de cambio actuales */
  exchangeRates: ExchangeRates;
  /** Convierte un monto de una moneda a la moneda de visualización */
  convertAmount: (amount: number, from?: string) => number;
  /** Formatea un monto en la moneda de visualización actual */
  formatAmount: (amount: number, showSymbol?: boolean) => string;
  /** Indica si está cargando los datos de moneda */
  isLoading: boolean;
  /** Alias de displayCurrency para compatibilidad con código anterior */
  currency: string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined
);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { data: session, update: updateSession } = useSession();
  
  // Moneda base (por defecto COP para todos los usuarios según requerimiento)
  const [baseCurrency, setBaseCurrency] = useState<string>("COP");
  
  // Moneda de visualización (por defecto USD)
  const [displayCurrency, setDisplayCurrency] = useState<string>("USD");
  
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({ USD: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Sincronizar con datos de la sesión del usuario
  useEffect(() => {
    if (session?.user && !isInitialized) {
      const user = session.user as any;
      
      // Establecer moneda base y de visualización según la moneda del usuario
      // Esto desactiva efectivamente el cambio de moneda según lo solicitado
      if (user.baseCurrency) {
        setBaseCurrency(user.baseCurrency);
        setDisplayCurrency(user.baseCurrency);
      } else {
        setBaseCurrency("COP");
        setDisplayCurrency("COP");
      }
      
      setIsInitialized(true);
    }
    // Siempre detener carga después de intentar leer la sesión
    if (session !== undefined) {
      setIsLoading(false);
    }
  }, [session, isInitialized]);

  // Cargar tasas de cambio desde la API
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch("/api/exchange-rates");
        const data = await res.json();
        if (data.success && data.rates) {
          setExchangeRates(data.rates);
        }
      } catch (error) {
        logger.error("Error fetching exchange rates:", error);
      }
    };

    fetchRates();
    const interval = setInterval(fetchRates, 30 * 60 * 1000); // Actualizar cada 30 minutos
    return () => clearInterval(interval);
  }, []);

  // Actualizar moneda de visualización
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
      logger.error("Error updating currency preference:", error);
    }
  };

  /**
   * Convierte un monto de la moneda ORIGEN a la moneda de VISUALIZACIÓN.
   * La moneda origen por defecto es la moneda BASE del usuario.
   */
  const convertAmount = (amount: number, fromCurrency?: string): number => {
    // Si aún no hay información de tasas, retornar el mismo monto
    if (Object.keys(exchangeRates).length <= 1 && amount !== 0) return amount;

    const sourceCurrency = fromCurrency || baseCurrency;
    
    // Si la moneda origen es igual a la de visualización, no se necesita conversión
    if (sourceCurrency === displayCurrency) return amount;

    // 1. Convertir origen a USD
    // La API retorna tasas relativas a USD (USD = 1).
    // Ej: 1 USD = X COP. Para ir de COP a USD, dividimos por Tasa(COP).
    const amountInUSD =
      sourceCurrency === "USD"
        ? amount
        : amount / (exchangeRates[sourceCurrency] || 1);

    // 2. Convertir de USD a moneda de visualización
    // Multiplicar por Tasa(MonedaVisualización)
    const rate = exchangeRates[displayCurrency] || 1;
    return amountInUSD * rate;
  };

  const formatAmount = (amount: number, showSymbol = true): string => {
    // Solo convertir si estamos formateando un valor que está en moneda base
    // Usa convertAmount con valores por defecto (de Base a Visualización)
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
        currency: displayCurrency, // Alias para compatibilidad
        setCurrency, // Actualiza la moneda de visualización
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
    return {
      baseCurrency: "USD",
      displayCurrency: "USD",
      currency: "USD",
      setCurrency: () => {},
      isConvertedView: false,
      exchangeRates: { USD: 1 },
      convertAmount: (amount: number) => amount,
      formatAmount: (amount: number) => String(amount),
      isLoading: false,
    };
  }

  return context;
}
