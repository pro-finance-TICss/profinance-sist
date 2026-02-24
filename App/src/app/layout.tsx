import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

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
        <Providers>
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
        </Providers>
      </body>
    </html>
  );
}
