"use client";

import React, { useState, useEffect } from "react";
import { Users, RefreshCw } from "lucide-react";
import { getUsers, toggleUserSocioRole } from "@/lib/actions/admin";

interface User {
  id: string;
  firstName: string;
  paternalSurname: string;
  email: string;
  role: string;
  createdAt: Date;
  totpEnabled: boolean;
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await getUsers();
      if (result.success && result.users) {
        setUsers(
          result.users.map((u: any) => ({
            ...u,
            createdAt: new Date(u.createdAt),
          }))
        );
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleRole = async (userId: string) => {
    setProcessingId(userId);
    try {
      const result = await toggleUserSocioRole(userId);
      if (result.success) {
        // Reload users to reflect changes
        await loadUsers();
        alert(result.message || `Rol actualizado exitosamente a: ${result.newRole}`);
      } else {
        alert(result.message || "Error al cambiar el rol");
      }
    } catch (error) {
      console.error("Error toggling role:", error);
      alert("Error al cambiar el rol");
    }
    setProcessingId(null);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return { bg: "rgba(239, 68, 68, 0.1)", color: "#ef4444" };
      case "ADMIN":
        return { bg: "rgba(249, 115, 22, 0.1)", color: "#f97316" };
      case "SOCIO":
        return { bg: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" };
      case "USER":
        return { bg: "rgba(16, 185, 129, 0.1)", color: "#10b981" };
      default:
        return { bg: "rgba(156, 163, 175, 0.1)", color: "#9ca3af" };
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.8rem", color: "#fff", margin: 0 }}>
            Gestión de Usuarios
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>
            Administra los roles de los usuarios entre USER y SOCIO
          </p>
        </div>
        <button
          onClick={loadUsers}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 24px",
            backgroundColor: "rgba(189, 142, 72, 0.1)",
            color: "#bd8e48",
            border: "1px solid rgba(189, 142, 72, 0.3)",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "600",
            transition: "all 0.3s",
            opacity: loading ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = "rgba(189, 142, 72, 0.2)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(189, 142, 72, 0.1)";
          }}
        >
          <RefreshCw size={20} />
          Actualizar
        </button>
      </div>

      <div
        style={{
          background: "#080808",
          borderRadius: "16px",
          border: "1px solid rgba(189, 142, 72, 0.3)",
          padding: "30px",
        }}
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
            Cargando usuarios...
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: "0 8px",
              }}
            >
              <thead>
                <tr
                  style={{
                    textAlign: "left",
                    color: "rgba(255, 255, 255, 0.5)",
                    fontSize: "0.8rem",
                    textTransform: "uppercase",
                  }}
                >
                  <th style={{ padding: "8px" }}>Nombre</th>
                  <th style={{ padding: "8px" }}>Email</th>
                  <th style={{ padding: "8px" }}>Rol Actual</th>
                  <th style={{ padding: "8px" }}>2FA</th>
                  <th style={{ padding: "8px" }}>Fecha Registro</th>
                  <th style={{ padding: "8px" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        textAlign: "center",
                        padding: "40px",
                        color: "#666",
                      }}
                    >
                      No hay usuarios registrados.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const roleColors = getRoleBadgeColor(user.role);
                    const canToggle = user.role === "USER" || user.role === "SOCIO";

                    return (
                      <tr
                        key={user.id}
                        style={{
                          background: "rgba(255, 255, 255, 0.03)",
                          borderRadius: "8px",
                        }}
                      >
                        <td style={{ padding: "12px", color: "white" }}>
                          {user.firstName} {user.paternalSurname}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            color: "rgba(255,255,255,0.7)",
                          }}
                        >
                          {user.email}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <span
                            style={{
                              padding: "4px 12px",
                              borderRadius: "6px",
                              background: roleColors.bg,
                              color: roleColors.color,
                              fontSize: "0.75rem",
                              fontWeight: "bold",
                              textTransform: "uppercase",
                            }}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td style={{ padding: "12px" }}>
                          <span
                            style={{
                              color: user.totpEnabled ? "#10b981" : "#666",
                              fontSize: "0.85rem",
                            }}
                          >
                            {user.totpEnabled ? "✓ Activo" : "✗ Inactivo"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            color: "rgba(255,255,255,0.6)",
                            fontSize: "0.85rem",
                          }}
                        >
                          {user.createdAt.toLocaleDateString()}
                        </td>
                        <td style={{ padding: "12px" }}>
                          {canToggle ? (
                            <button
                              onClick={() => handleToggleRole(user.id)}
                              disabled={processingId === user.id}
                              style={{
                                padding: "8px 16px",
                                backgroundColor: "rgba(59, 130, 246, 0.1)",
                                border: "1px solid rgba(59, 130, 246, 0.3)",
                                borderRadius: "6px",
                                color: "#3b82f6",
                                cursor:
                                  processingId === user.id
                                    ? "not-allowed"
                                    : "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                transition: "all 0.3s",
                                fontSize: "0.85rem",
                                fontWeight: "600",
                                opacity: processingId === user.id ? 0.5 : 1,
                              }}
                              onMouseEnter={(e) => {
                                if (processingId !== user.id) {
                                  e.currentTarget.style.backgroundColor =
                                    "rgba(59, 130, 246, 0.2)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "rgba(59, 130, 246, 0.1)";
                              }}
                            >
                              <RefreshCw size={14} />
                              {processingId === user.id
                                ? "Procesando..."
                                : `Cambiar a ${user.role === "USER" ? "SOCIO" : "USER"}`}
                            </button>
                          ) : (
                            <span
                              style={{
                                color: "#666",
                                fontSize: "0.85rem",
                                fontStyle: "italic",
                              }}
                            >
                              No modificable
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
