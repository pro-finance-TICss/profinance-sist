"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  MessageSquare,
  ShieldAlert,
  LayoutDashboard,
} from "lucide-react";

export function AdminSidebar() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <aside
      style={{
        width: "260px",
        borderRight: "1px solid rgba(255,255,255,0.1)",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          marginBottom: "40px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            backgroundColor: "#bd8e48",
          }}
        ></div>
        <span
          style={{
            fontWeight: "bold",
            fontSize: "1.1rem",
            letterSpacing: "1px",
          }}
        >
          PRO ADMIN
        </span>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <Link
          href="/admin/users"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px",
            borderRadius: "8px",
            backgroundColor: isActive("/admin/users")
              ? "rgba(255,255,255,0.08)"
              : "transparent",
            color: isActive("/admin/users") ? "#fff" : "#888",
            transition: "all 0.2s",
          }}
        >
          <Users size={20} /> Usuarios
        </Link>
        <Link
          href="/admin/tickets"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px",
            borderRadius: "8px",
            backgroundColor: isActive("/admin/tickets")
              ? "rgba(255,255,255,0.08)"
              : "transparent",
            color: isActive("/admin/tickets") ? "#fff" : "#888",
            transition: "all 0.2s",
          }}
        >
          <MessageSquare size={20} /> Tickets
        </Link>

        <div
          style={{
            margin: "20px 0",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        ></div>

        <div
          style={{
            fontSize: "0.75rem",
            textTransform: "uppercase",
            color: "#555",
            marginBottom: "8px",
            paddingLeft: "12px",
            fontWeight: 600,
          }}
        >
          Zona Restringida
        </div>

        <Link
          href="/superadmin/withdrawals"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid rgba(189,142,72,0.2)",
            backgroundColor: isActive("/superadmin")
              ? "rgba(189,142,72,0.1)"
              : "transparent",
            color: isActive("/superadmin") ? "#bd8e48" : "#866",
            transition: "all 0.2s",
          }}
        >
          <ShieldAlert size={20} /> Gestionar Retiros
        </Link>
      </nav>
    </aside>
  );
}
