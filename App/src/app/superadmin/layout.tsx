import { requireRole } from "@/lib/security";
import { UserRole } from "@/lib/enums";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    // STRICT CHECK: Only SuperAdmin
    await requireRole(UserRole.SUPER_ADMIN);
  } catch (e) {
    redirect("/admin"); // Redirect to Admin if just Admin, or Dashboard if User
  }

  // We reuse AdminSidebar but specialized for SuperAdmin context
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#050505",
        color: "#fefefe",
        position: "relative",
        zIndex: 10,
      }}
    >
      <AdminSidebar />
      <main
        style={{ flex: 1, padding: "40px", overflowY: "auto", height: "100vh" }}
      >
        <div
          style={{
            padding: "10px 20px",
            background: "rgba(189,142,72,0.1)",
            border: "1px solid #bd8e48",
            borderRadius: "8px",
            marginBottom: "30px",
            color: "#bd8e48",
          }}
        >
          🛡️ Estás en la Zona de Super Admin
        </div>
        {children}
      </main>
    </div>
  );
}
