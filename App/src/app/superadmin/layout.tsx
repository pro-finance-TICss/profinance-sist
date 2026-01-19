import { requireRole } from "@/lib/security";
import { UserRole } from "@/lib/enums";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    // STRICT CHECK: Only SuperAdmin
    await requireRole(UserRole.SUPER_ADMIN);
  } catch (e) {
    redirect("/admin");
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#000" /* BG NEGRO */,
        color: "#fff",
        position: "relative",
      }}
    >
      {/* 🦅 EL LOGO DEL ÁGUILA (FONDO) */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "62%",
          transform: "translate(-50%, -50%)",
          width: "100vh",
          height: "100vh",
          backgroundImage: 'url("/Background-recortado.png")',
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "contain",
          opacity: 0.04,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <AdminSidebar />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          zIndex: 10,
        }}
      >
        {/* HEADER */}
        <AdminHeader title="Super Admin Zone" role="SUPER_ADMIN" />

        <main style={{ flex: 1, padding: "30px 40px", overflowY: "auto" }}>
          {/* ALERTA DE ZONA SUPER ADMIN MANTENIDA PERO MEJORADA */}
          <div
            style={{
              padding: "10px 20px",
              background: "rgba(189,142,72,0.1)",
              border: "1px solid #bd8e48",
              borderRadius: "8px",
              marginBottom: "30px",
              color: "#bd8e48",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span>🛡️</span> <strong>ZONA DE SUPER ADMIN</strong> - Acceso con
            privilegios elevados.
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
