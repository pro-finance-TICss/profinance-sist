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
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <AccountProvider>
            <MainLayout>
              {children}
            </MainLayout>
          </AccountProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="background-container">
        <div className="bg-logo-placeholder"></div>
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
        }}
      >
        {children}
      </div>
    </>
  );
}
