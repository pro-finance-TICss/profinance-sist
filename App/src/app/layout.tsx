"use client";

import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "@/contexts/AuthContext";
import { AccountProvider } from "@/contexts/AccountContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <SessionProvider>
          <AuthProvider>
            <AccountProvider>
              {children}
            </AccountProvider>
          </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
