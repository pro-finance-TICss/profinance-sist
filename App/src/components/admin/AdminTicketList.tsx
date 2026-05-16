"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  updateTicketStatus,
  replyTicket,
  getAdminTicket,
} from "@/lib/actions/admin";
import { TicketStatus } from "@/lib/enums";
import { ActionModal } from "../dashboard/ActionModal";
import { Send, X } from "lucide-react";

interface AdminTicketListProps {
  tickets: any[];
}

export function AdminTicketList({ tickets }: AdminTicketListProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketDetail, setTicketDetail] = useState<any>(null);
  const [replyMesssage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    setLoading(ticketId);
    await updateTicketStatus(ticketId, newStatus as TicketStatus);
    setLoading(null);
  };

  const openTicket = async (id: string) => {
    setSelectedTicketId(id);
    const res = await getAdminTicket(id);
    if (res.success) {
      setTicketDetail(res.ticket);
      setTimeout(
        () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        100
      );
    }
  };

  const closeTicket = () => {
    setSelectedTicketId(null);
    setTicketDetail(null);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMesssage.trim() || !ticketDetail) return;

    setSendingReply(true);
    const res = await replyTicket(ticketDetail.id, replyMesssage);
    if (res.success) {
      setReplyMessage("");
      // Refresh details
      const updated = await getAdminTicket(ticketDetail.id);
      if (updated.success) {
        setTicketDetail(updated.ticket);
        setTimeout(
          () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
          100
        );
      }
    }
    setSendingReply(false);
  };

  // 1. Logic hooks
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("");

  const filteredTickets = tickets.filter((ticket) => {
    // 1. Filter by Status
    if (statusFilter !== "ALL" && ticket.status !== statusFilter) return false;

    // 2. Filter by Date
    if (dateFilter) {
      // Create a date object from the request time
      const ticketDate = new Date(ticket.createdAt);

      // Get the YYYY-MM-DD part in the local timezone
      const year = ticketDate.getFullYear();
      const month = String(ticketDate.getMonth() + 1).padStart(2, "0");
      const day = String(ticketDate.getDate()).padStart(2, "0");
      const localDateString = `${year}-${month}-${day}`;

      if (localDateString !== dateFilter) return false;
    }

    return true;
  });

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      {/* Filtros */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              backgroundColor: "#111",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <option value="ALL">Todos los estados</option>
            {Object.values(TicketStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              backgroundColor: "#111",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff",
              cursor: "pointer",
              colorScheme: "dark",
            }}
          />

          {(statusFilter !== "ALL" || dateFilter) && (
            <button
              onClick={() => {
                setStatusFilter("ALL");
                setDateFilter("");
              }}
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                backgroundColor: "rgba(255,255,255,0.1)",
                border: "none",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {filteredTickets.length === 0 ? (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            color: "#666",
            backgroundColor: "#111",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <p>No se encontraron tickets con los filtros actuales.</p>
        </div>
      ) : null}

      {filteredTickets.map((ticket) => (
        <div
          key={ticket.id}
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            padding: "20px",
            borderRadius: "12px",
            display: "flex",
            justifyContent: "space-between",
            gap: "20px",
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "8px",
              }}
            >
              <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                {ticket.subject}
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  backgroundColor: "rgba(255,255,255,0.1)",
                }}
              >
                {ticket.priority}
              </span>
            </div>
            <div
              style={{ color: "#aaa", fontSize: "0.9rem", marginBottom: "4px" }}
            >
              Usuario:{" "}
              <span style={{ color: "white" }}>{ticket.user.email}</span>
            </div>
            <div style={{ color: "#666", fontSize: "0.8rem" }}>
              ID: {ticket.id} • {new Date(ticket.createdAt).toLocaleString("es-ES")}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              minWidth: "150px",
            }}
          >
            <select
              value={ticket.status}
              onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
              disabled={loading === ticket.id}
              style={{
                padding: "8px",
                borderRadius: "6px",
                backgroundColor: "#222",
                color: "white",
                border: "1px solid #444",
              }}
            >
              {Object.values(TicketStatus).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button
              onClick={() => openTicket(ticket.id)}
              style={{
                padding: "8px",
                borderRadius: "6px",
                background: "#bd8e48",
                border: "none",
                color: "black",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Ver Mensajes ({ticket._count?.messages || 0})
            </button>
          </div>
        </div>
      ))}

      {/* Modal de Detalle */}
      {selectedTicketId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            backgroundColor: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "600px",
              height: "80vh",
              backgroundColor: "#111",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header Modal */}
            <div
              style={{
                padding: "20px",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0 }}>
                Chat con {ticketDetail?.user?.firstName || "Usuario"}
              </h3>
              <button
                onClick={closeTicket}
                style={{
                  background: "none",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                <X />
              </button>
            </div>

            {/* Messages Body */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {!ticketDetail ? (
                <p>Cargando...</p>
              ) : (
                ticketDetail.messages.map((msg: any) => (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: msg.isAdmin ? "flex-end" : "flex-start",
                      maxWidth: "80%",
                      backgroundColor: msg.isAdmin
                        ? "#bd8e48"
                        : "rgba(255,255,255,0.1)",
                      color: msg.isAdmin ? "black" : "white",
                      padding: "12px 16px",
                      borderRadius: 12,
                      borderBottomRightRadius: msg.isAdmin ? 0 : 12,
                      borderBottomLeftRadius: msg.isAdmin ? 12 : 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.75rem",
                        opacity: 0.7,
                        marginBottom: 4,
                      }}
                    >
                      {msg.isAdmin ? "Tú (Admin)" : "Usuario"} •{" "}
                      {new Date(msg.createdAt).toLocaleTimeString("es-ES")}
                    </div>
                    <div>{msg.message}</div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Footer Reply */}
            <div
              style={{
                padding: "20px",
                borderTop: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <form
                onSubmit={handleSendReply}
                style={{ display: "flex", gap: "10px" }}
              >
                <input
                  type="text"
                  value={replyMesssage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Escribe una respuesta como administrador..."
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #333",
                    background: "#222",
                    color: "white",
                  }}
                />
                <button
                  type="submit"
                  disabled={sendingReply}
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    background: "#bd8e48",
                    border: "none",
                    color: "black",
                    cursor: "pointer",
                  }}
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
