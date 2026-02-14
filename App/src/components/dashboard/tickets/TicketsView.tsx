"use client";
import React, { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ActionModal } from "../ActionModal";
import {
  getUserTickets,
  createTicket,
  getTicket,
  replyTicket,
} from "@/lib/actions/tickets";
import { Plus, MessageSquare, ArrowLeft, Send } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

interface TicketMessage {
  id: string;
  message: string;
  isAdmin: boolean;
  createdAt: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: { messages: number };
  messages?: TicketMessage[];
}

export function TicketsView() {
  const [view, setView] = useState<"LIST" | "DETAIL">("LIST");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Data Fetching
  useEffect(() => {
    if (view === "LIST") loadTickets();
  }, [view]);

  // Form State for New Ticket
  const [formData, setFormData] = useState({
    subject: "",
    priority: "MEDIUM",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Form State for Reply
  const [replyMessage, setReplyMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function loadTickets() {
    setLoading(true);
    const res = await getUserTickets();
    if (res.success && res.tickets) {
      setTickets(res.tickets as any);
    }
    setLoading(false);
  }

  async function openTicket(id: string) {
    setLoading(true);
    const res = await getTicket(id);
    if (res.success && res.ticket) {
      setSelectedTicket(res.ticket as any);
      setView("DETAIL");
      setTimeout(
        () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        100
      );
    }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await createTicket(formData as any);
    if (res.success) {
      setIsModalOpen(false);
      setFormData({ subject: "", priority: "MEDIUM", message: "" });
      loadTickets();
    }
    setSubmitting(false);
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    setSubmitting(true);
    const res = await replyTicket(selectedTicket.id, replyMessage);
    if (res.success) {
      setReplyMessage("");
      // Reload ticket details
      const updated = await getTicket(selectedTicket.id);
      if (updated.success && updated.ticket) {
        setSelectedTicket(updated.ticket as any);
        setTimeout(
          () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
          100
        );
      }
    }
    setSubmitting(false);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "#28a745"; // Green
      case "CLOSED":
        return "#6c757d"; // Grey
      case "IN_PROGRESS":
        return "#17a2b8"; // Blue
      case "RESOLVED":
        return "#bd8e48"; // Gold
      default:
        return "#ffc107"; // Yellow
    }
  };

  // --- RENDER DETAIL VIEW ---
  if (view === "DETAIL" && selectedTicket) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 200px)",
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <Button
            onClick={() => setView("LIST")}
            style={{
              width: "auto",
              background: "transparent",
              border: "1px solid #bd8e48",
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <ArrowLeft size={16} color="#bd8e48" />
            <span
              style={{
                background: "var(--bg-gradient-gold)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontWeight: "bold",
                fontSize: "0.85rem",
                letterSpacing: "1px",
              }}
            >
              VOLVER
            </span>
          </Button>
        </div>

        <div
          style={{
            backgroundColor: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: 24,
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              paddingBottom: 16,
              marginBottom: 16,
            }}
          >
            <h2 style={{ color: "white", margin: 0, fontSize: "1.4rem" }}>
              {selectedTicket.subject}
            </h2>
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 8,
                fontSize: "0.9rem",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              <span
                style={{
                  color: getStatusColor(selectedTicket.status),
                  border: `1px solid ${getStatusColor(selectedTicket.status)}`,
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: "0.8rem",
                }}
              >
                {selectedTicket.status}
              </span>
              <span>{selectedTicket.priority} Priority</span>
              <span>•</span>
              <span>
                {new Date(selectedTicket.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Messages Area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              paddingRight: 10,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {selectedTicket.messages?.map((msg) => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.isAdmin ? "flex-start" : "flex-end",
                  maxWidth: "80%",
                  backgroundColor: msg.isAdmin
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(189, 142, 72, 0.2)",
                  color: msg.isAdmin ? "white" : "#bd8e48",
                  padding: "12px 16px",
                  borderRadius: 12,
                  borderBottomLeftRadius: msg.isAdmin ? 0 : 12,
                  borderBottomRightRadius: msg.isAdmin ? 12 : 0,
                }}
              >
                <div
                  style={{ fontSize: "0.8rem", opacity: 0.7, marginBottom: 4 }}
                >
                  {msg.isAdmin ? "Soporte" : "Tú"} •{" "}
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </div>
                <div style={{ lineHeight: 1.5 }}>{msg.message}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Input */}
          <div
            style={{
              marginTop: 20,
              borderTop: "1px solid rgba(255,255,255,0.1)",
              paddingTop: 16,
            }}
          >
            {selectedTicket.status === "CLOSED" ? (
              <p
                style={{ textAlign: "center", color: "rgba(255,255,255,0.5)" }}
              >
                Este ticket está cerrado.
              </p>
            ) : (
              <form onSubmit={handleReply} style={{ display: "flex", gap: 10 }}>
                <input
                  type="text"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Escribe una respuesta..."
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.2)",
                    backgroundColor: "rgba(0,0,0,0.3)",
                    color: "white",
                    outline: "none",
                  }}
                />
                <Button
                  type="submit"
                  disabled={submitting || !replyMessage.trim()}
                  style={{ width: "auto" }}
                >
                  <Send size={18} />
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER LIST VIEW ---
  return (
    <div>
      {/* 🟢 Título solo para la vista principal de Soporte */}
      <PageHeader
        title="Centro de Soporte"
        subtitle="Gestiona tus solicitudes de ayuda y comunícate con nuestro equipo técnico."
      />

      {/* Aquí mantenemos TU control de botones original intacto */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 0, // Ajustado para que el gap del padre haga el trabajo
        }}
      >
        <Button
          onClick={() => setIsModalOpen(true)}
          style={{ width: "auto", padding: "10px 20px" }}
        >
          <Plus size={18} style={{ marginRight: 8 }} /> Nuevo Ticket
        </Button>
      </div>

      {loading ? (
        <p style={{ color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
          Cargando tickets...
        </p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {tickets.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 60,
                color: "rgba(255,255,255,0.4)",
                border: "1px dashed rgba(255,255,255,0.1)",
                borderRadius: 12,
              }}
            >
              <MessageSquare
                size={40}
                style={{ marginBottom: 15, opacity: 0.5, margin: "0 auto" }}
              />
              <p>No tienes tickets de soporte activos.</p>
            </div>
          ) : (
            tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => openTicket(ticket.id)}
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  padding: 20,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transition: "background 0.2s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "rgba(255,255,255,0.06)")
                }
                onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "rgba(255,255,255,0.03)")
                }
              >
                <div>
                  <h3
                    style={{
                      color: "white",
                      fontSize: "1.1rem",
                      marginBottom: 6,
                    }}
                  >
                    {ticket.subject}
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      fontSize: "0.85rem",
                      color: "rgba(255,255,255,0.5)",
                    }}
                  >
                    <span style={{ fontFamily: "monospace", opacity: 0.7 }}>
                      Ref: {ticket.id.slice(-8)}
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span>{ticket.priority}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      display: "inline-block",
                      padding: "6px 14px",
                      borderRadius: 20,
                      backgroundColor: `${getStatusColor(ticket.status)}20`,
                      color: getStatusColor(ticket.status),
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      border: `1px solid ${getStatusColor(ticket.status)}40`,
                      letterSpacing: "0.5px",
                    }}
                  >
                    {ticket.status.replace("_", " ")}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <ActionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Ticket"
      >
        <form
          onSubmit={handleCreate}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <Input
            label="Asunto"
            value={formData.subject}
            onChange={(e) =>
              setFormData({ ...formData, subject: e.target.value })
            }
            placeholder="Ej: Problema con depósito"
            required
          />

          <div>
            <label
              style={{
                display: "block",
                color: "rgba(255,255,255,0.7)",
                fontSize: "0.9rem",
                marginBottom: 6,
              }}
            >
              Prioridad
            </label>
            <select
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: e.target.value })
              }
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: 8,
                color: "white",
                outline: "none",
                fontSize: "1rem",
              }}
            >
              <option value="LOW" style={{ color: "black" }}>
                Baja
              </option>
              <option value="MEDIUM" style={{ color: "black" }}>
                Media
              </option>
              <option value="HIGH" style={{ color: "black" }}>
                Alta
              </option>
              <option value="URGENT" style={{ color: "black" }}>
                Urgente
              </option>
            </select>
          </div>

          <div>
            <label
              style={{
                display: "block",
                color: "rgba(255,255,255,0.7)",
                fontSize: "0.9rem",
                marginBottom: 6,
              }}
            >
              Mensaje
            </label>
            <textarea
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              required
              rows={5}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: 8,
                color: "white",
                resize: "none",
                outline: "none",
                fontFamily: "inherit",
                fontSize: "0.95rem",
              }}
              placeholder="Describe tu problema detalladamente..."
            />
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? "Enviando..." : "Crear Ticket"}
          </Button>
        </form>
      </ActionModal>
    </div>
  );
}
