// ============================================================================
// API ROUTE - EXCHANGE RATES
// ============================================================================
// Obtiene las tasas de cambio actuales usando ExchangeRate-API v6
// Datos precisos y actualizados diariamente, alineados con Google Finance

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// Lista de monedas soportadas
const SUPPORTED_CURRENCIES = ["USD", "COP", "EUR", "MXN", "GBP"];

// Cache simple en memoria (en producción, usar Redis)
let ratesCache: {
  rates: Record<string, number>;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos (actualizar más frecuentemente)

export async function GET() {
  try {
    // Verificar cache
    if (
      ratesCache &&
      Date.now() - ratesCache.timestamp < CACHE_DURATION
    ) {
      logger.debug("📦 Using cached exchange rates");
      return NextResponse.json({
        success: true,
        rates: ratesCache.rates,
        cached: true,
        cacheAge: Math.floor((Date.now() - ratesCache.timestamp) / 1000 / 60) + " minutes",
      });
    }

    logger.debug("🔄 Fetching fresh exchange rates...");

    // Usar ExchangeRate-API v6 (gratis, 1500 requests/mes, actualizado diariamente)
    // Esta API usa datos del ECB y otros bancos centrales
    const response = await fetch(
      `https://open.er-api.com/v6/latest/USD`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates: ${response.status}`);
    }

    const data = await response.json();

    if (data.result !== "success") {
      throw new Error("Exchange rate API returned error");
    }

    // Filtrar solo las monedas soportadas
    const filteredRates: Record<string, number> = {
      USD: 1, // USD siempre es 1 (base)
    };

    for (const currency of SUPPORTED_CURRENCIES) {
      if (currency === 'USD') continue;
      if (data.conversion_rates && data.conversion_rates[currency]) {
        filteredRates[currency] = data.conversion_rates[currency];
      }
    }

    // Validar que tengamos todas las monedas
    const missingCurrencies = SUPPORTED_CURRENCIES.filter(c => !filteredRates[c]);
    if (missingCurrencies.length > 0) {
      logger.warn("⚠️ Missing currencies:", missingCurrencies);
    }

    // Actualizar cache
    ratesCache = {
      rates: filteredRates,
      timestamp: Date.now(),
    };

    logger.debug("✅ Exchange rates updated:", filteredRates);
    logger.debug(`💰 1 USD = ${filteredRates.COP?.toFixed(2)} COP (Google TRM)`);

    return NextResponse.json({
      success: true,
      rates: filteredRates,
      cached: false,
      timestamp: new Date().toISOString(),
      source: "ExchangeRate-API v6",
      nextUpdate: data.time_next_update_utc,
    });
  } catch (error) {
    logger.error("❌ Error fetching exchange rates:", error);
    
    // Si hay caché antiguo, usarlo
    if (ratesCache) {
      logger.debug("⚠️ Using stale cache due to error");
      return NextResponse.json({
        success: true,
        rates: ratesCache.rates,
        cached: true,
        stale: true,
        cacheAge: Math.floor((Date.now() - ratesCache.timestamp) / 1000 / 60) + " minutes",
      });
    }
    
    // Retornar tasas por defecto en caso de error total
    return NextResponse.json(
      {
        success: false,
        rates: {
          USD: 1,
          COP: 3670, // TRM aproximado actual (Feb 2026)
          EUR: 0.92,
          MXN: 17,
          GBP: 0.79,
        },
        error: "Using fallback rates",
      },
      { status: 200 } // No fallar completamente
    );
  }
}

