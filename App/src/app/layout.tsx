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
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
