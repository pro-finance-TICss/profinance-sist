"use client";

import { SessionProvider } from "next-auth/react";
import { AccountProvider } from "@/contexts/AccountContext";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <AccountProvider>{children}</AccountProvider>
    </SessionProvider>
  );
}
