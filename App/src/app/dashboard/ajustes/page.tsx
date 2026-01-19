"use client";

import { ProfileSettings } from "@/components/dashboard/ajustes/ProfileSettings";
import { SecuritySettings } from "@/components/dashboard/ajustes/SecuritySettings";
import { GeneralSettings } from "@/components/dashboard/ajustes/GeneralSettings";

export default function AjustesPage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      <ProfileSettings />
      <SecuritySettings />
      <GeneralSettings />
    </div>
  );
}
