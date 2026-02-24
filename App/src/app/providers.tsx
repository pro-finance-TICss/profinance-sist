"use client";

import { AuthProvider } from "@/components/security/AuthProvider";
import { AccountProvider } from "@/contexts/AccountContext";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AccountProvider>
        {children}
      </AccountProvider>
    </AuthProvider>
  );
}
