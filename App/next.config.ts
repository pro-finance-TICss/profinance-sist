// ============================================================================
// CONFIGURACIÓN DE NEXT.JS - PRO-FINANCE
// ============================================================================
// Incluye paquetes externos para el servidor y headers de seguridad HTTP.
// ============================================================================

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Paquetes que deben ejecutarse en el servidor (no se empaquetan en el cliente)
  serverExternalPackages: ["otplib", "qrcode"],

  // Headers de seguridad HTTP aplicados a todas las respuestas
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            // Previene que el navegador interprete archivos con tipos MIME incorrectos
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            // Previene ataques de clickjacking (iframe embedding)
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            // Activa el filtro XSS del navegador
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            // Controla qué información de referencia se envía con las peticiones
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            // Política de permisos - deshabilita APIs sensibles no necesarias
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
