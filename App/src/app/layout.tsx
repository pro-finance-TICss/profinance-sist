import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProFinance - App",
  description: "App financiera avanzada de ProFinance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <div className="background-container">
          <div className="bg-logo-placeholder"></div>
        </div>
        {children}
      </body>
    </html>
  );
}
