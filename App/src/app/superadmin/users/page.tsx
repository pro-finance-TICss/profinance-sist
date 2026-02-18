"use client";

import React, { useState, useEffect } from "react";
import { Users, RefreshCw, ChevronDown, ChevronRight, Box, PlusCircle, X } from "lucide-react";
import { getUsers, toggleAccountRole, addCapitalToAccount } from "@/lib/actions/admin";
import { logger } from "@/lib/logger";

interface AccountInfo {
  id: string;
  name: string;
  role: string;
  investedCapital: any;
  createdAt: Date;
}

interface User {
  id: string;
  firstName: string;
  paternalSurname: string;
  email: string;
  role: string;
  createdAt: Date;
  totpEnabled: boolean;
  accounts?: AccountInfo[];
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositConfig, setDepositConfig] = useState<{
    accountId: string;
    accountName: string;
  } | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositing, setDepositing] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await getUsers();
      if (result.success && result.users) {
        setUsers(
          result.users.map((u: any) => ({
            ...u,
            createdAt: new Date(u.createdAt),
            accounts: (u.accounts || []).map((acc: any) => ({
              ...acc,
              createdAt: new Date(acc.createdAt),
            })),
          }))
        );
      }
    } catch (error) {
      logger.error("Error loading users:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const toggleExpanded = (userId: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleToggleAccountRole = async (accountId: string) => {
    setProcessingId(accountId);
    try {
      const result = await toggleAccountRole(accountId);
      if (result.success) {
        await loadUsers();
        alert(result.message || `Rol de cajita actualizado a: ${result.newRole}`);
      } else {
        alert(result.message || "Error al cambiar el rol");
      }
    } catch (error) {
      logger.error("Error toggling account role:", error);
      alert("Error al cambiar el rol de la cajita");
    }
    setProcessingId(null);
  };

  const openDepositModal = (accountId: string, accountName: string) => {
    setDepositConfig({ accountId, accountName });
    setDepositAmount("");
    setIsDepositModalOpen(true);
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositConfig || !depositAmount) return;

    setDepositing(true);
    const amount = parseFloat(depositAmount);

    if (isNaN(amount) || amount <= 0) {
      alert("Por favor ingrese un monto válido mayor a 0");
      setDepositing(false);
      return;
    }

    try {
      const result = await addCapitalToAccount(depositConfig.accountId, amount);
      if (result.success) {
        alert(result.message);
        setIsDepositModalOpen(false);
        setDepositConfig(null);
        setDepositAmount("");
        loadUsers();
      } else {
        alert(result.message || "Error al agregar saldo");
      }
    } catch (error) {
      console.error(error);
      alert("Error inesperado al procesar el depósito");
    }
    setDepositing(false);
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
            Administra los roles de las cajitas de cada usuario y monitorea su capital.
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
                  <th style={{ padding: "8px", width: "40px" }}></th>
                  <th style={{ padding: "8px" }}>Nombre</th>
                  <th style={{ padding: "8px" }}>Email</th>
                  <th style={{ padding: "8px" }}>Rol Global</th>
                  <th style={{ padding: "8px" }}>Cajitas</th>
                  <th style={{ padding: "8px" }}>2FA</th>
                  <th style={{ padding: "8px" }}>Fecha Registro</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
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
                    const isExpanded = expandedUsers.has(user.id);
                    const accountCount = user.accounts?.length || 0;
                    const canExpand = accountCount > 0;

                    return (
                      <React.Fragment key={user.id}>
                        {/* Fila principal del usuario */}
                        <tr
                          style={{
                            background: isExpanded
                              ? "rgba(189, 142, 72, 0.05)"
                              : "rgba(255, 255, 255, 0.03)",
                            cursor: canExpand ? "pointer" : "default",
                            transition: "background 0.2s",
                          }}
                          onClick={() => canExpand && toggleExpanded(user.id)}
                        >
                          <td style={{ padding: "12px", textAlign: "center" }}>
                            {canExpand && (
                              <span
                                style={{
                                  color: "#bd8e48",
                                  display: "inline-flex",
                                  transition: "transform 0.2s",
                                }}
                              >
                                {isExpanded ? (
                                  <ChevronDown size={18} />
                                ) : (
                                  <ChevronRight size={18} />
                                )}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "12px", color: "white", fontWeight: 500 }}>
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
                                color: accountCount > 0 ? "#bd8e48" : "#666",
                                fontSize: "0.85rem",
                                fontWeight: 600,
                              }}
                            >
                              {accountCount} {accountCount === 1 ? "cajita" : "cajitas"}
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
                        </tr>

                        {/* Filas expandidas: Cajitas del usuario */}
                        {isExpanded &&
                          user.accounts?.map((account) => {
                            const accRoleColors = getRoleBadgeColor(account.role);

                            return (
                              <tr
                                key={account.id}
                                style={{
                                  background: "rgba(189, 142, 72, 0.02)",
                                  borderLeft: "3px solid #bd8e48",
                                }}
                              >
                                <td style={{ padding: "10px 12px" }}></td>
                                <td
                                  colSpan={2}
                                  style={{
                                    padding: "10px 12px",
                                    paddingLeft: "20px",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "10px",
                                    }}
                                  >
                                    <Box
                                      size={16}
                                      style={{ color: "#bd8e48", flexShrink: 0 }}
                                    />
                                    <div>
                                      <p
                                        style={{
                                          margin: 0,
                                          color: "#fff",
                                          fontSize: "0.9rem",
                                          fontWeight: 500,
                                        }}
                                      >
                                        {account.name}
                                      </p>
                                      <p
                                        style={{
                                          margin: 0,
                                          color: "rgba(255,255,255,0.4)",
                                          fontSize: "0.75rem",
                                        }}
                                      >
                                        Capital: $
                                        {Number(account.investedCapital).toLocaleString("en-US", {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td style={{ padding: "10px 12px" }}>
                                  <span
                                    style={{
                                      padding: "3px 10px",
                                      borderRadius: "6px",
                                      background: accRoleColors.bg,
                                      color: accRoleColors.color,
                                      fontSize: "0.7rem",
                                      fontWeight: "bold",
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    {account.role}
                                  </span>
                                </td>
                                <td colSpan={2} style={{ padding: "10px 12px" }}>
                                  <div style={{ display: "flex", gap: "10px" }}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleAccountRole(account.id);
                                      }}
                                      disabled={processingId === account.id}
                                      style={{
                                        padding: "6px 14px",
                                        backgroundColor:
                                          account.role === "USER"
                                            ? "rgba(59, 130, 246, 0.1)"
                                            : "rgba(16, 185, 129, 0.1)",
                                        border: `1px solid ${
                                          account.role === "USER"
                                            ? "rgba(59, 130, 246, 0.3)"
                                            : "rgba(16, 185, 129, 0.3)"
                                        }`,
                                        borderRadius: "6px",
                                        color:
                                          account.role === "USER"
                                            ? "#3b82f6"
                                            : "#10b981",
                                        cursor:
                                          processingId === account.id
                                            ? "not-allowed"
                                            : "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        transition: "all 0.3s",
                                        fontSize: "0.8rem",
                                        fontWeight: "600",
                                        opacity:
                                          processingId === account.id ? 0.5 : 1,
                                      }}
                                    >
                                      <RefreshCw size={12} />
                                      {processingId === account.id
                                        ? "..."
                                        : `${
                                            account.role === "USER"
                                              ? "A SOCIO"
                                              : "A USER"
                                          }`}
                                    </button>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openDepositModal(account.id, account.name);
                                      }}
                                      style={{
                                        padding: "6px 14px",
                                        backgroundColor: "rgba(234, 179, 8, 0.1)",
                                        border: "1px solid rgba(234, 179, 8, 0.3)",
                                        borderRadius: "6px",
                                        color: "#eab308",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        transition: "all 0.3s",
                                        fontSize: "0.8rem",
                                        fontWeight: "600",
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(234, 179, 8, 0.2)"}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(234, 179, 8, 0.1)"}
                                    >
                                      <PlusCircle size={12} />
                                      Saldo
                                    </button>
                                  </div>
                                </td>
                                <td
                                  style={{
                                    padding: "10px 12px",
                                    color: "rgba(255,255,255,0.4)",
                                    fontSize: "0.8rem",
                                  }}
                                >
                                  {account.createdAt.toLocaleDateString()}
                                </td>
                              </tr>
                            );
                          })}

                        {/* Si está expandido y no tiene cajitas */}
                        {isExpanded && accountCount === 0 && (
                          <tr
                            style={{
                              background: "rgba(189, 142, 72, 0.02)",
                            }}
                          >
                            <td></td>
                            <td
                              colSpan={6}
                              style={{
                                padding: "15px 20px",
                                color: "#666",
                                fontStyle: "italic",
                                fontSize: "0.85rem",
                              }}
                            >
                              Este usuario no tiene cajitas creadas.
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para Agregar Saldo */}
      {isDepositModalOpen && depositConfig && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={() => {
             if (!depositing) {
                setIsDepositModalOpen(false);
                setDepositConfig(null);
             }
          }}
        >
          <div
            style={{
              backgroundColor: "#111",
              border: "1px solid #333",
              borderRadius: "12px",
              padding: "24px",
              width: "400px",
              maxWidth: "90%",
              boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h3 style={{ margin: 0, color: "#fff", fontSize: "1.2rem" }}>
                Agregar Saldo
              </h3>
              <button
                onClick={() => {
                  if (!depositing) {
                     setIsDepositModalOpen(false);
                     setDepositConfig(null);
                  }
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#666",
                  cursor: "pointer",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleDepositSubmit}>
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "0.9rem",
                    marginBottom: "8px",
                  }}
                >
                  Cajita Destino
                </label>
                <div
                  style={{
                    padding: "10px",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "0.95rem",
                  }}
                >
                  {depositConfig.accountName}
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label
                  style={{
                    display: "block",
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "0.9rem",
                    marginBottom: "8px",
                  }}
                >
                  Monto a Agregar ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: "100%",
                    padding: "12px",
                    backgroundColor: "#000",
                    border: "1px solid #333",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "1rem",
                    outline: "none",
                  }}
                  autoFocus
                />
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  disabled={depositing}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "transparent",
                    border: "1px solid #333",
                    color: "#ccc",
                    borderRadius: "6px",
                    cursor: depositing ? "not-allowed" : "pointer",
                    fontWeight: 600,
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={depositing}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#eab308",
                    border: "none",
                    color: "#000",
                    borderRadius: "6px",
                    cursor: depositing ? "not-allowed" : "pointer",
                    fontWeight: 600,
                    opacity: depositing ? 0.7 : 1,
                    display: "flex",
                    alignItems: "center", 
                    gap: "8px"
                  }}
                >
                  {depositing ? "Procesando..." : "Confirmar Depósito"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
