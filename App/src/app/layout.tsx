import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/security/AuthProvider";
import { AccountProvider } from "@/contexts/AccountContext";

export const metadata: Metadata = {
  title: "ProFinance - App",
  description: "App financiera - ProFinance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        {/* NIVEL 1: Proveedor de autenticación con detección de inactividad */}
        <AuthProvider>
          {/* NIVEL 2: Proveedor de gestión de cuentas (NUEVO) */}
          <AccountProvider>
            <div className="background-container">
              <div className="bg-logo-placeholder"></div>
            </div>
            <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
              {children}
            </div>
          </AccountProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
