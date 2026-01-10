import { getAllTickets } from "@/lib/actions/admin";
import { AdminTicketList } from "@/components/admin/AdminTicketList";

export default async function AdminTicketsPage() {
  const { tickets } = await getAllTickets();

  return (
    <div>
      <header style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: "bold", margin: 0 }}>
          Gestión de Tickets
        </h1>
        <p style={{ color: "gray", marginTop: "5px" }}>
          Atención y seguimiento de casos de soporte.
        </p>
      </header>

      <AdminTicketList tickets={tickets || []} />
    </div>
  );
}
