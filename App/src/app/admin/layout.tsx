import { requireRole } from "@/lib/security";
import { UserRole } from "@/lib/enums";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    // Verifica si es ADMIN o SUPER_ADMIN. requireRole(ADMIN) allows SUPER_ADMIN too.
    await requireRole(UserRole.ADMIN);
  } catch (e) {
    redirect("/dashboard");
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#09090b",
        color: "#ececec",
        position: "relative",
        zIndex: 10,
      }}
    >
      <AdminSidebar />
      <main
        style={{ flex: 1, padding: "40px", overflowY: "auto", height: "100vh" }}
      >
        {children}
      </main>
    </div>
  );
}
