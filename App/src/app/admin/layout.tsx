import { requireRole } from "@/lib/security";
import { UserRole } from "@/lib/enums";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    // Verifica si es ADMIN o SUPER_ADMIN.
    await requireRole(UserRole.ADMIN);
  } catch (e) {
    redirect("/dashboard");
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
          left: "62%", // Ajuste similar al dashboard
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
        <AdminHeader title="Administración" role="ADMIN" />

        <main style={{ flex: 1, padding: "30px 40px", overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
