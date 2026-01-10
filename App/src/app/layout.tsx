import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/security/AuthProvider";

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
        {/* Proveedor de autenticación con detección de inactividad */}
        <AuthProvider>
          <div className="background-container">
            <div className="bg-logo-placeholder"></div>
          </div>
          <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
