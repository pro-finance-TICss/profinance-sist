"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Box,
  PlusCircle,
  X,
  UserPlus,
  Pencil,
  Trash2,
  AlertTriangle,
  MinusCircle,
} from "lucide-react";
import {
  getUsers,
  toggleAccountRole,
  addCapitalToAccount,
  removeCapitalFromAccount,
  createUser,
  updateUser,
  deleteUser,
  deleteAccount,
  getUserDeletePreview,
  createInvestmentAccountForUser,
} from "@/lib/actions/admin";
import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

interface AccountInfo {
  id: string;
  name: string;
  type: string; // SAVINGS | INVESTMENT
  role: string;
  isHighRisk: boolean;
  investedCapital: any;
  createdAt: Date;
}

interface UserRow {
  id: string;
  firstName: string;
  paternalSurname: string;
  maternalSurname?: string;
  email: string;
  role: string;
  country?: string | null;
  baseCurrency?: string;
  createdAt: Date;
  totpEnabled: boolean;
  accounts?: AccountInfo[];
}

type ModalMode = "create" | "edit" | "delete" | "deposit" | "withdraw" | "createAccount" | null;

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  CO: "COP",
  MX: "MXN",
  US: "USD",
  ES: "EUR",
};

const ROLE_OPTIONS = [
  { value: "USER", label: "Usuario (USER)" },
  { value: "SOCIO", label: "Socio (SOCIO)" },
  { value: "ADMIN", label: "Administrador (ADMIN)" },
];

const CURRENCY_OPTIONS = ["COP", "USD", "MXN", "EUR"];

// ============================================================================
// HELPERS
// ============================================================================

const splitLastNames = (full: string) => {
  const parts = full.trim().split(/\s+/);
  const paternalSurname = parts[0] || "";
  const maternalSurname = parts.slice(1).join(" ") || "";
  return { paternalSurname, maternalSurname };
};

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case "SUPER_ADMIN":
      return { bg: "rgba(239,68,68,0.12)", color: "#ef4444", border: "rgba(239,68,68,0.3)" };
    case "ADMIN":
      return { bg: "rgba(249,115,22,0.12)", color: "#f97316", border: "rgba(249,115,22,0.3)" };
    case "SOCIO":
      return { bg: "rgba(59,130,246,0.12)", color: "#3b82f6", border: "rgba(59,130,246,0.3)" };
    case "USER":
      return { bg: "rgba(16,185,129,0.12)", color: "#10b981", border: "rgba(16,185,129,0.3)" };
    default:
      return { bg: "rgba(156,163,175,0.12)", color: "#9ca3af", border: "rgba(156,163,175,0.3)" };
  }
};

/** Etiqueta de rol legible para el usuario */
const getRoleLabel = (role: string): string => {
  switch (role) {
    case "USER": return "Usuario";
    case "SOCIO": return "Socio";
    case "ADMIN": return "Admin";
    case "SUPER_ADMIN": return "Super Admin";
    default: return role;
  }
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  backgroundColor: "#0a0a0a",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "0.9rem",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "rgba(255,255,255,0.55)",
  fontSize: "0.78rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "6px",
};

const fieldGroup = (label: string, children: React.ReactNode) => (
  <div style={{ marginBottom: "16px" }}>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

// ============================================================================
// MODAL OVERLAY
// ============================================================================

function ModalOverlay({
  onClose,
  children,
  width = 480,
}: {
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.85)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#0d0d0d",
          border: "1px solid rgba(189,142,72,0.25)",
          borderRadius: "16px",
          padding: "28px",
          width: "100%",
          maxWidth: width,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
          animation: "fadeInScale 0.18s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "24px",
        paddingBottom: "16px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <h3 style={{ margin: 0, color: "#fff", fontSize: "1.15rem", fontWeight: 700 }}>
        {title}
      </h3>
      <button
        onClick={onClose}
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#aaa",
          cursor: "pointer",
          borderRadius: "8px",
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.1)";
          e.currentTarget.style.color = "#fff";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
          e.currentTarget.style.color = "#aaa";
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  // Create form
  const [createForm, setCreateForm] = useState({
    firstName: "",
    paternalSurname: "",
    maternalSurname: "",
    email: "",
    password: "",
    isAdmin: false,
    accountRole: "USER" as "USER" | "SOCIO",
    country: "CO",
    baseCurrency: "COP",
    lastNames: "",
    isSuperAdmin: false,
  });

  // Edit form
  const [editForm, setEditForm] = useState({
    firstName: "",
    paternalSurname: "",
    maternalSurname: "",
    email: "",
    country: "",
    baseCurrency: "COP",
    role: "USER" as "USER" | "SOCIO" | "ADMIN" | "SUPER_ADMIN",
    lastNames: "",
  });

  // Delete preview
  const [deletePreview, setDeletePreview] = useState<any>(null);
  const [deletePreviewLoading, setDeletePreviewLoading] = useState(false);

  // Deposit
  const [depositConfig, setDepositConfig] = useState<{ accountId: string; accountName: string } | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositing, setDepositing] = useState(false);

  // Withdraw
  const [withdrawConfig, setWithdrawConfig] = useState<{ accountId: string; accountName: string } | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  // Create investment account
  const [createAccountUserId, setCreateAccountUserId] = useState<string | null>(null);
  const [createAccountUserName, setCreateAccountUserName] = useState("");
  const [createAccountUserRole, setCreateAccountUserRole] = useState("");
  const [createAccountName, setCreateAccountName] = useState("");
  const [createAccountAmount, setCreateAccountAmount] = useState("");
  const [createAccountIsAR, setCreateAccountIsAR] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);

  // ── Feedback auto-dismiss ──
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  // ── Load users ──
  const loadUsers = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // ── Toggle expand ──
  const toggleExpanded = (userId: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  // ── CLOSE modals ──
  const closeModal = () => {
    if (processingId) return;
    setModalMode(null);
    setSelectedUser(null);
    setDeletePreview(null);
    setDepositConfig(null);
    setDepositAmount("");
    setWithdrawConfig(null);
    setWithdrawAmount("");
    setCreateAccountUserId(null);
    setCreateAccountUserName("");
    setCreateAccountUserRole("");
    setCreateAccountName("");
    setCreateAccountAmount("");
    setCreateAccountIsAR(false);
  };

  // ── OPEN CREATE ──
  const openCreate = () => {
    setCreateForm({
      firstName: "",
      paternalSurname: "",
      maternalSurname: "",
      email: "",
      password: "",
      isAdmin: false,
      accountRole: "USER",
      country: "CO",
      baseCurrency: "COP",
      lastNames: "",
      isSuperAdmin: false,
    });
    setModalMode("create");
  };

  // ── OPEN EDIT ──
  const openEdit = (user: UserRow) => {
    setSelectedUser(user);
    setEditForm({
      firstName: user.firstName,
      paternalSurname: user.paternalSurname,
      maternalSurname: user.maternalSurname || "",
      email: user.email,
      country: user.country || "",
      baseCurrency: user.baseCurrency || "COP",
      role: (user.role as any) || "USER",
      lastNames: `${user.paternalSurname} ${user.maternalSurname || ""}`.trim(),
    });
    setModalMode("edit");
  };

  // ── OPEN DELETE ──
  const openDelete = async (user: UserRow) => {
    setSelectedUser(user);
    setModalMode("delete");
    setDeletePreview(null);
    setDeletePreviewLoading(true);
    const result = await getUserDeletePreview(user.id);
    setDeletePreviewLoading(false);
    if (result.success) {
      setDeletePreview(result.preview);
    } else {
      setDeletePreview({ error: result.message });
    }
  };

  // ── OPEN DEPOSIT ──
  const openDeposit = (accountId: string, accountName: string) => {
    setDepositConfig({ accountId, accountName });
    setDepositAmount("");
    setModalMode("deposit");
  };

  // ── OPEN WITHDRAW ──
  const openWithdraw = (accountId: string, accountName: string) => {
    setWithdrawConfig({ accountId, accountName });
    setWithdrawAmount("");
    setModalMode("withdraw");
  };

  // ── OPEN CREATE ACCOUNT ──
  const openCreateAccount = (userId: string, userName: string, userRole: string) => {
    setCreateAccountUserId(userId);
    setCreateAccountUserName(userName);
    setCreateAccountUserRole(userRole);
    setCreateAccountName("");
    setCreateAccountAmount("");
    setCreateAccountIsAR(false);
    setModalMode("createAccount");
  };

  // ── HANDLERS ──

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingId("create");
    // Derivar rol: SUPER_ADMIN > ADMIN > accountRole (SOCIO o USER)
    const role = createForm.isSuperAdmin
      ? "SUPER_ADMIN"
      : createForm.isAdmin
        ? "ADMIN"
        : createForm.accountRole; // USER o SOCIO según lo que eligió el admin

    const result = await createUser({
      firstName: createForm.firstName,
      email: createForm.email,
      password: createForm.password,
      role,
      accountRole: (createForm.isAdmin || createForm.isSuperAdmin) ? "USER" : createForm.accountRole,
      country: createForm.country,
      baseCurrency: createForm.baseCurrency,
      ...splitLastNames(createForm.lastNames),
    });

    setProcessingId(null);
    setFeedback({ msg: result.message || "Operación completada.", ok: result.success });
    if (result.success) {
      closeModal();
      loadUsers();
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setProcessingId(selectedUser.id);
    const result = await updateUser(selectedUser.id, {
      ...editForm,
      ...splitLastNames(editForm.lastNames),
    } as any);
    setProcessingId(null);
    setFeedback({ msg: result.message || "Operación completada.", ok: result.success });
    if (result.success) {
      closeModal();
      loadUsers();
    }
  };

  const handleDelete = async () => {
    if (!selectedUser || deletePreview?.error) return;
    setProcessingId(selectedUser.id);
    const result = await deleteUser(selectedUser.id);
    setProcessingId(null);
    setFeedback({ msg: result.message || "Operación completada.", ok: result.success });
    closeModal();
    if (result.success) loadUsers();
  };

  const handleToggleAccountRole = async (accountId: string) => {
    setProcessingId(accountId);
    try {
      const result = await toggleAccountRole(accountId);
      setFeedback({ msg: result.message || "Rol actualizado.", ok: result.success });
      if (result.success) loadUsers();
    } catch (error) {
      logger.error("Error toggling account role:", error);
      setFeedback({ msg: "Error al cambiar el rol de la cajita.", ok: false });
    }
    setProcessingId(null);
  };

  const handleDeleteAccount = async (accountId: string, accountName: string) => {
    if (!window.confirm(`¿Eliminar la cuenta "${accountName}"? Esta acción es irreversible.`)) return;
    setProcessingId(accountId);
    try {
      const result = await deleteAccount(accountId);
      setFeedback({ msg: result.message || "Cuenta eliminada.", ok: result.success });
      if (result.success) loadUsers();
    } catch (error) {
      logger.error("Error deleting account:", error);
      setFeedback({ msg: "Error al eliminar la cuenta.", ok: false });
    }
    setProcessingId(null);
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositConfig || !depositAmount) return;
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setFeedback({ msg: "Por favor ingrese un monto válido mayor a 0.", ok: false });
      return;
    }
    setDepositing(true);
    setProcessingId(depositConfig.accountId);
    const result = await addCapitalToAccount(depositConfig.accountId, amount);
    setDepositing(false);
    setProcessingId(null);
    setFeedback({ msg: result.message || "Operación completada.", ok: result.success });
    if (result.success) {
      closeModal();
      loadUsers();
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawConfig || !withdrawAmount) return;
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setFeedback({ msg: "Por favor ingrese un monto válido mayor a 0.", ok: false });
      return;
    }
    setWithdrawing(true);
    setProcessingId(withdrawConfig.accountId);
    const result = await removeCapitalFromAccount(withdrawConfig.accountId, amount);
    setWithdrawing(false);
    setProcessingId(null);
    setFeedback({ msg: result.message || "Operación completada.", ok: result.success });
    if (result.success) {
      closeModal();
      loadUsers();
    }
  };

  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createAccountUserId || !createAccountName) return;
    const amount = createAccountAmount ? parseFloat(createAccountAmount) : 0;
    if (isNaN(amount) || amount < 0) {
      setFeedback({ msg: "El monto inicial debe ser 0 o mayor.", ok: false });
      return;
    }
    setCreatingAccount(true);
    setProcessingId(createAccountUserId);
    const result = await createInvestmentAccountForUser(createAccountUserId, createAccountName, amount, createAccountIsAR);
    setCreatingAccount(false);
    setProcessingId(null);
    setFeedback({ msg: result.message || "Operación completada.", ok: result.success });
    if (result.success) {
      closeModal();
      loadUsers();
    }
  };

  // ── Country change → auto currency ──
  const handleCountryChange = (
    val: string,
    form: "create" | "edit"
  ) => {
    const upper = val.toUpperCase();
    const currency = COUNTRY_CURRENCY_MAP[upper] || null;
    if (form === "create") {
      setCreateForm((p) => ({
        ...p,
        country: upper,
        ...(currency ? { baseCurrency: currency } : {}),
      }));
    } else {
      setEditForm((p) => ({
        ...p,
        country: upper,
        ...(currency ? { baseCurrency: currency } : {}),
      }));
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div>
      {/* ── Feedback Banner ── */}
      {feedback && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 2000,
            padding: "14px 20px",
            borderRadius: "12px",
            background: feedback.ok
              ? "rgba(16,185,129,0.15)"
              : "rgba(239,68,68,0.15)",
            border: `1px solid ${feedback.ok ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}`,
            color: feedback.ok ? "#10b981" : "#ef4444",
            fontWeight: 600,
            fontSize: "0.9rem",
            maxWidth: 380,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            animation: "fadeInScale 0.2s ease",
          }}
        >
          {feedback.ok ? "✓ " : "✗ "}{feedback.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "30px",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.8rem", color: "#fff", margin: 0 }}>
            Gestión de Usuarios
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", marginTop: 4 }}>
            Crea, edita, elimina usuarios y administra sus cuentas de inversión.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={loadUsers}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              backgroundColor: "rgba(189,142,72,0.1)",
              color: "#bd8e48",
              border: "1px solid rgba(189,142,72,0.3)",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: "0.88rem",
              transition: "all 0.2s",
              opacity: loading ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = "rgba(189,142,72,0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(189,142,72,0.1)";
            }}
          >
            <RefreshCw size={16} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            Actualizar
          </button>
          <button
            onClick={openCreate}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              background: "linear-gradient(135deg, #bd8e48, #a07030)",
              color: "#000",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.88rem",
              transition: "all 0.2s",
              boxShadow: "0 4px 12px rgba(189,142,72,0.3)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <UserPlus size={16} />
            Crear Usuario
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div
        style={{
          background: "#080808",
          borderRadius: "16px",
          border: "1px solid rgba(189,142,72,0.2)",
          padding: "24px",
        }}
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#555" }}>
            <RefreshCw size={28} style={{ animation: "spin 1s linear infinite", marginBottom: 12 }} />
            <p style={{ margin: 0 }}>Cargando usuarios...</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: "0 6px",
              }}
            >
              <thead>
                <tr
                  style={{
                    textAlign: "left",
                    color: "rgba(255,255,255,0.35)",
                    fontSize: "0.72rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}
                >
                  <th style={{ padding: "6px 10px", width: 36 }} />
                  <th style={{ padding: "6px 10px" }}>Nombre</th>
                  <th style={{ padding: "6px 10px" }}>Email</th>
                  <th style={{ padding: "6px 10px" }}>Rol</th>
                  <th style={{ padding: "6px 10px" }}>DIVISA</th>
                  <th style={{ padding: "6px 10px" }}>2FA</th>
                  <th style={{ padding: "6px 10px" }}>Registro</th>
                  <th style={{ padding: "6px 10px", textAlign: "center" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{ textAlign: "center", padding: "50px", color: "#555" }}
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
                    const isUserSuperAdmin = user.role === "SUPER_ADMIN";

                    // Badge de moneda
                    const currencyBadge = user.baseCurrency || "—";

                    return (
                      <React.Fragment key={user.id}>
                        {/* ── User row ── */}
                        <tr
                          style={{
                            background: isExpanded
                              ? "rgba(189,142,72,0.06)"
                              : "rgba(255,255,255,0.025)",
                            cursor: canExpand ? "pointer" : "default",
                            transition: "background 0.15s",
                            borderRadius: "8px",
                          }}
                          onClick={() => canExpand && toggleExpanded(user.id)}
                        >
                          {/* Expand chevron */}
                          <td style={{ padding: "12px 10px", textAlign: "center" }}>
                            {canExpand && (
                              <span style={{ color: "#bd8e48", display: "inline-flex" }}>
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </span>
                            )}
                          </td>

                          {/* Name */}
                          <td style={{ padding: "12px 10px", color: "#fff", fontWeight: 500 }}>
                            {user.firstName} {user.paternalSurname}
                          </td>

                          {/* Email */}
                          <td style={{ padding: "12px 10px", color: "rgba(255,255,255,0.65)", fontSize: "0.87rem" }}>
                            {user.email}
                          </td>

                          {/* Rol general del usuario */}
                          <td style={{ padding: "12px 10px" }}>
                            <span
                              style={{
                                padding: "3px 10px",
                                borderRadius: "6px",
                                background: roleColors.bg,
                                color: roleColors.color,
                                border: `1px solid ${roleColors.border}`,
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                letterSpacing: "0.05em",
                              }}
                            >
                              {getRoleLabel(user.role)}
                            </span>
                          </td>

                          {/* DIVISA (replacing Cuentas) */}
                          <td style={{ padding: "12px 10px" }}>
                            <span
                              style={{
                                padding: "2px 9px",
                                borderRadius: "6px",
                                background: "rgba(189,142,72,0.1)",
                                color: "#bd8e48",
                                border: "1px solid rgba(189,142,72,0.25)",
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                fontFamily: "monospace",
                              }}
                            >
                              {currencyBadge}
                            </span>
                          </td>

                          {/* 2FA */}
                          <td style={{ padding: "12px 10px" }}>
                            <span style={{ color: user.totpEnabled ? "#10b981" : "#555", fontSize: "0.82rem" }}>
                              {user.totpEnabled ? "✓ Activo" : "✗ Inactivo"}
                            </span>
                          </td>

                          {/* Date */}
                          <td style={{ padding: "12px 10px", color: "rgba(255,255,255,0.45)", fontSize: "0.82rem" }}>
                            {user.createdAt.toLocaleDateString()}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: "12px 10px" }}>
                            <div
                              style={{ display: "flex", gap: "6px", justifyContent: "center" }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Nueva Cuenta de Inversión — solo para USER/SOCIO */}
                              {(user.role === "USER" || user.role === "SOCIO") && (
                                <ActionBtn
                                  icon={<PlusCircle size={13} />}
                                  label=""
                                  title="Crear cuenta de inversión"
                                  color="#a855f7"
                                  onClick={() => openCreateAccount(user.id, `${user.firstName} ${user.paternalSurname}`, user.role)}
                                />
                              )}
                              <ActionBtn
                                icon={<Pencil size={13} />}
                                label=""
                                title="Editar usuario"
                                color="#3b82f6"
                                onClick={() => openEdit(user)}
                              />
                              <ActionBtn
                                icon={<Trash2 size={13} />}
                                label=""
                                title="Eliminar usuario"
                                color="#ef4444"
                                onClick={() => openDelete(user)}
                              />
                            </div>
                          </td>
                        </tr>

                        {/* ── Accounts sub-rows ── */}
                        {isExpanded &&
                          user.accounts?.map((account) => {
                            const isSavings = account.type === "SAVINGS";
                            const isInvestment = account.type === "INVESTMENT";
                            // AR: ahora usa el flag explícito isHighRisk
                            const isAR = isInvestment && account.isHighRisk;
                            const acctTypeColor = isSavings
                              ? { bg: "rgba(20,184,166,0.12)", color: "#14b8a6", border: "rgba(20,184,166,0.3)" }
                              : { bg: "rgba(168,85,247,0.12)", color: "#a855f7", border: "rgba(168,85,247,0.3)" };
                            // Colores AR (naranja/ámbar)
                            const arColor = { bg: "rgba(234,179,8,0.12)", color: "#eab308", border: "rgba(234,179,8,0.3)" };
                            return (
                              <tr
                                key={account.id}
                                style={{
                                  background: isSavings
                                    ? "rgba(20,184,166,0.025)"
                                    : "rgba(168,85,247,0.025)",
                                  borderLeft: `3px solid ${isSavings ? "rgba(20,184,166,0.4)" : "rgba(168,85,247,0.4)"}`,
                                }}
                              >
                                <td style={{ padding: "10px 10px" }} />
                                <td colSpan={5} style={{ padding: "10px 10px 10px 20px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    <Box size={15} style={{ color: isSavings ? "#14b8a6" : "#a855f7", flexShrink: 0 }} />
                                    <div>
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                                        <p style={{ margin: 0, color: "#fff", fontSize: "0.88rem", fontWeight: 500 }}>
                                          {account.name}
                                        </p>
                                        {/* Tipo de cuenta */}
                                        <span
                                          style={{
                                            padding: "1px 7px",
                                            borderRadius: "4px",
                                            background: acctTypeColor.bg,
                                            color: acctTypeColor.color,
                                            border: `1px solid ${acctTypeColor.border}`,
                                            fontSize: "0.62rem",
                                            fontWeight: 700,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.06em",
                                          }}
                                        >
                                          {isSavings ? "Ahorro" : "Inversión"}
                                        </span>
                                        {/* Badge AR solo para inversión de Socios */}
                                        {isAR && (
                                          <span
                                            style={{
                                              padding: "1px 7px",
                                              borderRadius: "4px",
                                              background: arColor.bg,
                                              color: arColor.color,
                                              border: `1px solid ${arColor.border}`,
                                              fontSize: "0.62rem",
                                              fontWeight: 700,
                                              letterSpacing: "0.06em",
                                            }}
                                          >
                                            AR
                                          </span>
                                        )}
                                      </div>
                                      <p style={{ margin: 0, color: "rgba(255,255,255,0.38)", fontSize: "0.74rem" }}>
                                        Capital: ${Number(account.investedCapital).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                {/* Columna de Fecha */}
                                <td style={{ padding: "10px", color: "rgba(255,255,255,0.35)", fontSize: "0.78rem" }}>
                                  {account.createdAt.toLocaleDateString()}
                                </td>
                                {/* Columna de Acciones */}
                                <td style={{ padding: "10px" }}>
                                  <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                                    {/* Toggle AR: solo para cuentas de inversión cuando el usuario es SOCIO */}
                                    {isInvestment && user.role === "SOCIO" && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleAccountRole(account.id);
                                        }}
                                        title={isAR ? "Cambiar a Inversión Normal" : "Cambiar a Alto Riesgo"}
                                        disabled={processingId === account.id}
                                        style={{
                                          padding: "5px 8px",
                                          backgroundColor: isAR ? "rgba(16,185,129,0.1)" : "rgba(234,179,8,0.1)",
                                          border: `1px solid ${isAR ? "rgba(16,185,129,0.3)" : "rgba(234,179,8,0.3)"}`,
                                          borderRadius: "6px",
                                          color: isAR ? "#10b981" : "#eab308",
                                          cursor: processingId === account.id ? "not-allowed" : "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "5px",
                                          fontSize: "0.75rem",
                                          fontWeight: 600,
                                          opacity: processingId === account.id ? 0.5 : 1,
                                          transition: "all 0.2s",
                                        }}
                                      >
                                        <RefreshCw size={12} />
                                        {processingId === account.id ? "..." : isAR ? "Norm" : "AR"}
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openDeposit(account.id, account.name);
                                      }}
                                      title="Añadir Capital"
                                      style={{
                                        padding: "5px 8px",
                                        backgroundColor: "rgba(234,179,8,0.1)",
                                        border: "1px solid rgba(234,179,8,0.3)",
                                        borderRadius: "6px",
                                        color: "#eab308",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        fontSize: "0.75rem",
                                        fontWeight: 600,
                                        transition: "all 0.2s",
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(234,179,8,0.2)")}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(234,179,8,0.1)")}
                                    >
                                      <PlusCircle size={12} />
                                      +$
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openWithdraw(account.id, account.name);
                                      }}
                                      title="Retirar Capital"
                                      style={{
                                        padding: "5px 8px",
                                        backgroundColor: "rgba(234,179,8,0.1)",
                                        border: "1px solid rgba(234,179,8,0.3)",
                                        borderRadius: "6px",
                                        color: "#eab308",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        fontSize: "0.75rem",
                                        fontWeight: 600,
                                        transition: "all 0.2s",
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(234,179,8,0.2)")}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(234,179,8,0.1)")}
                                    >
                                      <MinusCircle size={12} />
                                      -$
                                    </button>
                                    {/* Eliminar cuenta */}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteAccount(account.id, account.name);
                                      }}
                                      disabled={processingId === account.id}
                                      title={Number(account.investedCapital) > 0 ? "Primero retira el capital" : "Eliminar cuenta"}
                                      style={{
                                        padding: "5px 8px",
                                        backgroundColor: "rgba(239,68,68,0.1)",
                                        border: "1px solid rgba(239,68,68,0.3)",
                                        borderRadius: "6px",
                                        color: "#ef4444",
                                        cursor: processingId === account.id ? "not-allowed" : "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "0.75rem",
                                        fontWeight: 600,
                                        opacity: processingId === account.id ? 0.5 : 1,
                                        transition: "all 0.2s",
                                      }}
                                      onMouseEnter={(e) => { if (processingId !== account.id) e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.2)"; }}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.1)")}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}

                        {/* No accounts message */}
                        {isExpanded && accountCount === 0 && (
                          <tr style={{ background: "rgba(189,142,72,0.02)" }}>
                            <td />
                            <td
                              colSpan={7}
                              style={{ padding: "14px 20px", color: "#555", fontStyle: "italic", fontSize: "0.83rem" }}
                            >
                              Este usuario no tiene cuentas registradas.
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

      {/* ══════════════════════════════════════════════
          MODAL: CREAR USUARIO
      ══════════════════════════════════════════════ */}
      {modalMode === "create" && (
        <ModalOverlay onClose={processingId ? () => { } : closeModal} width={520}>
          <ModalHeader title="✦ Crear Nuevo Usuario" onClose={processingId ? () => { } : closeModal} />
          <form onSubmit={handleCreate}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              {fieldGroup("Nombre(s) *", (
                <input
                  style={inputStyle}
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm((p) => ({ ...p, firstName: e.target.value }))}
                  placeholder="Juan Carlos"
                  required
                />
              ))}
              {fieldGroup("Apellidos *", (
                <input
                  style={inputStyle}
                  value={createForm.lastNames}
                  onChange={(e) => setCreateForm((p) => ({ ...p, lastNames: e.target.value }))}
                  placeholder="García López"
                  required
                />
              ))}
            </div>

            {fieldGroup("Correo Electrónico *", (
              <input
                style={inputStyle}
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="usuario@email.com"
                required
              />
            ))}
            {fieldGroup("Contraseña Temporal * (mín. 8 caracteres)", (
              <input
                style={inputStyle}
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                required
              />
            ))}

            {/* ── ¿Es Super Administrador? ── */}
            <div
              style={{
                padding: "14px 16px",
                background: createForm.isSuperAdmin
                  ? "rgba(239,68,68,0.08)"
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${createForm.isSuperAdmin ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"
                  }`,
                borderRadius: "10px",
                marginBottom: "12px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onClick={() =>
                setCreateForm((p) => ({
                  ...p,
                  isSuperAdmin: !p.isSuperAdmin,
                  isAdmin: !p.isSuperAdmin ? true : p.isAdmin // Si es super admin, marcamos admin también
                }))
              }
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "5px",
                    border: `2px solid ${createForm.isSuperAdmin ? "#ef4444" : "rgba(255,255,255,0.2)"
                      }`,
                    background: createForm.isSuperAdmin ? "#ef4444" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.2s",
                  }}
                >
                  {createForm.isSuperAdmin && (
                    <span style={{ color: "#fff", fontSize: "12px", fontWeight: 700 }}>✓</span>
                  )}
                </div>
                <div>
                  <p
                    style={{
                      margin: 0,
                      color: createForm.isSuperAdmin ? "#ef4444" : "#fff",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                    }}
                  >
                    Es Super Administrador (SUPER_ADMIN)
                  </p>
                  <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.4)", fontSize: "0.76rem" }}>
                    Máximo nivel de acceso. Puede gestionar otros administradores.
                  </p>
                </div>
              </label>
            </div>

            {/* ── ¿Es Administrador? ── */}
            <div
              style={{
                padding: "14px 16px",
                background: createForm.isAdmin
                  ? "rgba(249,115,22,0.08)"
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${createForm.isAdmin ? "rgba(249,115,22,0.3)" : "rgba(255,255,255,0.08)"
                  }`,
                borderRadius: "10px",
                marginBottom: "16px",
                cursor: createForm.isSuperAdmin ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                opacity: createForm.isSuperAdmin ? 0.6 : 1,
              }}
              onClick={() => {
                if (createForm.isSuperAdmin) return;
                setCreateForm((p) => ({ ...p, isAdmin: !p.isAdmin }));
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  cursor: createForm.isSuperAdmin ? "not-allowed" : "pointer",
                }}
              >
                {/* Custom checkbox */}
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "5px",
                    border: `2px solid ${createForm.isAdmin ? "#f97316" : "rgba(255,255,255,0.2)"
                      }`,
                    background: createForm.isAdmin ? "#f97316" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.2s",
                  }}
                >
                  {createForm.isAdmin && (
                    <span style={{ color: "#fff", fontSize: "12px", fontWeight: 700 }}>✓</span>
                  )}
                </div>
                <div>
                  <p
                    style={{
                      margin: 0,
                      color: createForm.isAdmin ? "#f97316" : "#fff",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      transition: "color 0.2s",
                    }}
                  >
                    Es Administrador (ADMIN)
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      color: "rgba(255,255,255,0.4)",
                      fontSize: "0.76rem",
                    }}
                  >
                    Tendrá acceso al panel de administración del sistema.
                  </p>
                </div>
              </label>
            </div>

            {/* ── Rol general del usuario (solo si NO es admin) ── */}
            {(!createForm.isAdmin && !createForm.isSuperAdmin) && (
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Rol general del usuario *</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  {(["USER", "SOCIO"] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setCreateForm((p) => ({ ...p, accountRole: role }))}
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: `1px solid ${createForm.accountRole === role
                            ? role === "SOCIO"
                              ? "rgba(59,130,246,0.5)"
                              : "rgba(16,185,129,0.5)"
                            : "rgba(255,255,255,0.08)"
                          }`,
                        background:
                          createForm.accountRole === role
                            ? role === "SOCIO"
                              ? "rgba(59,130,246,0.1)"
                              : "rgba(16,185,129,0.1)"
                            : "rgba(255,255,255,0.03)",
                        color:
                          createForm.accountRole === role
                            ? role === "SOCIO"
                              ? "#3b82f6"
                              : "#10b981"
                            : "rgba(255,255,255,0.45)",
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        transition: "all 0.2s",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      <span>{role === "USER" ? "👤 Usuario" : "🤝 Socio"}</span>
                      <span style={{ fontSize: "0.69rem", fontWeight: 400, opacity: 0.7 }}>
                        {role === "USER"
                          ? "Rol estándar (cuentas Normales)"
                          : "Rol socio (puede tener cuentas AR)"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              {fieldGroup("País (ISO, ej: CO)", (
                <input
                  style={inputStyle}
                  value={createForm.country}
                  onChange={(e) => handleCountryChange(e.target.value, "create")}
                  placeholder="CO"
                  maxLength={2}
                />
              ))}
              {fieldGroup("Moneda Base *", (
                <select
                  style={{ ...inputStyle, cursor: "pointer" }}
                  value={createForm.baseCurrency}
                  onChange={(e) => setCreateForm((p) => ({ ...p, baseCurrency: e.target.value }))}
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c} value={c} style={{ background: "#111" }}>{c}</option>
                  ))}
                </select>
              ))}
            </div>

            <div
              style={{
                padding: "12px",
                background: "rgba(189,142,72,0.07)",
                border: "1px solid rgba(189,142,72,0.2)",
                borderRadius: "8px",
                marginBottom: "20px",
                color: "rgba(255,255,255,0.55)",
                fontSize: "0.78rem",
                lineHeight: 1.6,
              }}
            >
              ⚠️ El usuario deberá <strong style={{ color: "#bd8e48" }}>cambiar su contraseña y configurar 2FA</strong> al primer inicio de sesión. Se creará una cuenta de inversión inicial automáticamente.
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={closeModal}
                disabled={!!processingId}
                style={{
                  padding: "10px 20px",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#aaa",
                  borderRadius: "8px",
                  cursor: processingId ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  fontSize: "0.88rem",
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!!processingId}
                style={{
                  padding: "10px 24px",
                  background: processingId ? "rgba(189,142,72,0.4)" : "linear-gradient(135deg, #bd8e48, #a07030)",
                  border: "none",
                  color: "#000",
                  borderRadius: "8px",
                  cursor: processingId ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {processingId ? "Creando..." : "Crear Usuario"}
              </button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {/* ══════════════════════════════════════════════
          MODAL: EDITAR USUARIO
      ══════════════════════════════════════════════ */}
      {modalMode === "edit" && selectedUser && (
        <ModalOverlay onClose={processingId ? () => { } : closeModal} width={520}>
          <ModalHeader
            title={`✎ Editar: ${selectedUser.firstName} ${selectedUser.paternalSurname}`}
            onClose={processingId ? () => { } : closeModal}
          />
          <form onSubmit={handleEdit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              {fieldGroup("Nombre(s) *", (
                <input
                  style={inputStyle}
                  value={editForm.firstName}
                  onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))}
                  required
                />
              ))}
              {fieldGroup("Apellidos *", (
                <input
                  style={inputStyle}
                  value={editForm.lastNames}
                  onChange={(e) => setEditForm((p) => ({ ...p, lastNames: e.target.value }))}
                  required
                />
              ))}
            </div>

            {fieldGroup("Correo Electrónico *", (
              <input
                style={inputStyle}
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                required
              />
            ))}
            {fieldGroup("Rol Global *", (
              <select
                style={{ ...inputStyle, cursor: "pointer" }}
                value={editForm.role}
                onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value as any }))}
              >
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} style={{ background: "#111" }}>
                    {o.label}
                  </option>
                ))}
                <option value="SUPER_ADMIN" style={{ background: "#111" }}>Super Administrador (SUPER_ADMIN)</option>
              </select>
            ))}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              {fieldGroup("País (ISO, ej: CO)", (
                <input
                  style={inputStyle}
                  value={editForm.country}
                  onChange={(e) => handleCountryChange(e.target.value, "edit")}
                  placeholder="CO"
                  maxLength={2}
                />
              ))}
              {fieldGroup("Moneda Base *", (
                <select
                  style={{ ...inputStyle, cursor: "pointer" }}
                  value={editForm.baseCurrency}
                  onChange={(e) => setEditForm((p) => ({ ...p, baseCurrency: e.target.value }))}
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c} value={c} style={{ background: "#111" }}>{c}</option>
                  ))}
                </select>
              ))}
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={closeModal}
                disabled={!!processingId}
                style={{
                  padding: "10px 20px",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#aaa",
                  borderRadius: "8px",
                  cursor: processingId ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  fontSize: "0.88rem",
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!!processingId}
                style={{
                  padding: "10px 24px",
                  background: processingId ? "rgba(59,130,246,0.3)" : "linear-gradient(135deg, #3b82f6, #2563eb)",
                  border: "none",
                  color: "#fff",
                  borderRadius: "8px",
                  cursor: processingId ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {processingId ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {/* ══════════════════════════════════════════════
          MODAL: ELIMINAR USUARIO (con preview)
      ══════════════════════════════════════════════ */}
      {modalMode === "delete" && selectedUser && (
        <ModalOverlay onClose={processingId ? () => { } : closeModal} width={500}>
          <ModalHeader title="⚠ Confirmar Eliminación" onClose={processingId ? () => { } : closeModal} />

          <div
            style={{
              padding: "14px 16px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: "10px",
              marginBottom: "20px",
              display: "flex",
              gap: "12px",
              alignItems: "flex-start",
            }}
          >
            <AlertTriangle size={18} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ margin: 0, color: "#ef4444", fontWeight: 700, fontSize: "0.9rem" }}>
                Esta acción es irreversible
              </p>
              <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.55)", fontSize: "0.82rem" }}>
                Se eliminarán todos los datos asociados al usuario.
              </p>
            </div>
          </div>

          {deletePreviewLoading && (
            <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>
              <RefreshCw size={20} style={{ animation: "spin 1s linear infinite" }} />
              <p style={{ marginTop: 8, fontSize: "0.85rem" }}>Cargando resumen...</p>
            </div>
          )}

          {deletePreview?.error && (
            <div style={{ color: "#ef4444", fontSize: "0.88rem", marginBottom: 20 }}>
              ✗ {deletePreview.error}
            </div>
          )}

          {deletePreview && !deletePreview.error && (
            <>
              <div style={{ marginBottom: 20 }}>
                <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.8rem", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Se eliminará:
                </p>

                {/* User info */}
                <div
                  style={{
                    padding: "12px 14px",
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: "8px",
                    marginBottom: 8,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <p style={{ margin: 0, color: "#fff", fontWeight: 600, fontSize: "0.92rem" }}>
                      {deletePreview.name}
                    </p>
                    <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>
                      {deletePreview.email}
                    </p>
                  </div>
                  <span
                    style={{
                      ...getRoleBadgeColor(deletePreview.role),
                      padding: "2px 8px",
                      borderRadius: "5px",
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      textTransform: "uppercase" as const,
                      border: `1px solid ${getRoleBadgeColor(deletePreview.role).border}`,
                    }}
                  >
                    {deletePreview.role}
                  </span>
                </div>

                {/* Accounts */}
                {deletePreview.accounts?.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    {deletePreview.accounts.map((acc: any) => (
                      <div
                        key={acc.id}
                        style={{
                          padding: "10px 14px",
                          background: "rgba(189,142,72,0.06)",
                          borderRadius: "7px",
                          marginBottom: 4,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Box size={13} style={{ color: "#bd8e48" }} />
                          <span style={{ color: "#fff", fontSize: "0.85rem" }}>{acc.name}</span>
                        </div>
                        <span style={{ color: "#bd8e48", fontSize: "0.82rem", fontWeight: 600 }}>
                          ${Number(acc.investedCapital).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Counts summary */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "6px",
                    marginTop: 8,
                  }}
                >
                  {[
                    { label: "Transacciones", val: deletePreview.counts?.transactions ?? 0 },
                    { label: "Retiros", val: deletePreview.counts?.withdrawalRequests ?? 0 },
                    { label: "Tickets", val: deletePreview.counts?.tickets ?? 0 },
                    { label: "Sesiones", val: deletePreview.counts?.sessions ?? 0 },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        padding: "8px",
                        background: "rgba(255,255,255,0.03)",
                        borderRadius: "7px",
                        textAlign: "center",
                      }}
                    >
                      <p style={{ margin: 0, color: "#fff", fontWeight: 700, fontSize: "1.1rem" }}>
                        {item.val}
                      </p>
                      <p style={{ margin: 0, color: "rgba(255,255,255,0.35)", fontSize: "0.68rem", marginTop: 2 }}>
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  onClick={closeModal}
                  disabled={!!processingId}
                  style={{
                    padding: "10px 20px",
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#aaa",
                    borderRadius: "8px",
                    cursor: processingId ? "not-allowed" : "pointer",
                    fontWeight: 600,
                    fontSize: "0.88rem",
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!!processingId}
                  style={{
                    padding: "10px 24px",
                    background: processingId ? "rgba(239,68,68,0.3)" : "linear-gradient(135deg, #ef4444, #dc2626)",
                    border: "none",
                    color: "#fff",
                    borderRadius: "8px",
                    cursor: processingId ? "not-allowed" : "pointer",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Trash2 size={14} />
                  {processingId ? "Eliminando..." : "Confirmar Eliminación"}
                </button>
              </div>
            </>
          )}
        </ModalOverlay>
      )}

      {/* ══════════════════════════════════════════════
          MODAL: AGREGAR SALDO
      ══════════════════════════════════════════════ */}
      {modalMode === "deposit" && depositConfig && (
        <ModalOverlay onClose={depositing ? () => { } : closeModal} width={420}>
          <ModalHeader title="+ Agregar Saldo" onClose={depositing ? () => { } : closeModal} />
          <form onSubmit={handleDepositSubmit}>
            {fieldGroup("Cuenta Destino", (
              <div
                style={{
                  padding: "10px 12px",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "0.9rem",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {depositConfig.accountName}
              </div>
            ))}
            {fieldGroup("Monto a Agregar ($) *", (
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.00"
                style={inputStyle}
                autoFocus
                required
              />
            ))}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={closeModal}
                disabled={depositing}
                style={{
                  padding: "10px 20px",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#aaa",
                  borderRadius: "8px",
                  cursor: depositing ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  fontSize: "0.88rem",
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={depositing}
                style={{
                  padding: "10px 24px",
                  background: depositing ? "rgba(234,179,8,0.4)" : "linear-gradient(135deg, #eab308, #ca8a04)",
                  border: "none",
                  color: "#000",
                  borderRadius: "8px",
                  cursor: depositing ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  fontSize: "0.88rem",
                }}
              >
                {depositing ? "Procesando..." : "Confirmar Depósito"}
              </button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {/* ══════════════════════════════════════════════
          MODAL: QUITAR SALDO
      ══════════════════════════════════════════════ */}
      {modalMode === "withdraw" && withdrawConfig && (
        <ModalOverlay onClose={withdrawing ? () => { } : closeModal} width={420}>
          <ModalHeader title="- Quitar Saldo" onClose={withdrawing ? () => { } : closeModal} />
          <form onSubmit={handleWithdrawSubmit}>
            {fieldGroup("Cuenta Destino", (
              <div
                style={{
                  padding: "10px 12px",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "0.9rem",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {withdrawConfig.accountName}
              </div>
            ))}
            {fieldGroup("Monto a Quitar ($) *", (
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="0.00"
                style={inputStyle}
                autoFocus
                required
              />
            ))}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={closeModal}
                disabled={withdrawing}
                style={{
                  padding: "10px 20px",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#aaa",
                  borderRadius: "8px",
                  cursor: withdrawing ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  fontSize: "0.88rem",
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={withdrawing}
                style={{
                  padding: "10px 24px",
                  background: withdrawing ? "rgba(234,179,8,0.4)" : "linear-gradient(135deg, #eab308, #ca8a04)",
                  border: "none",
                  color: "#000",
                  borderRadius: "8px",
                  cursor: withdrawing ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  fontSize: "0.88rem",
                }}
              >
                {withdrawing ? "Procesando..." : "Confirmar Retiro"}
              </button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {/* ══════════════════════════════════════════════
          MODAL: CREAR CUENTA DE INVERSIÓN
      ══════════════════════════════════════════════ */}
      {modalMode === "createAccount" && createAccountUserId && (
        <ModalOverlay onClose={creatingAccount ? () => { } : closeModal} width={460}>
          <ModalHeader
            title="✦ Crear Cuenta de Inversión"
            onClose={creatingAccount ? () => { } : closeModal}
          />
          {/* Info del usuario */}
          <div
            style={{
              padding: "10px 14px",
              background: "rgba(168,85,247,0.07)",
              border: "1px solid rgba(168,85,247,0.25)",
              borderRadius: "8px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <Box size={16} style={{ color: "#a855f7", flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, color: "#fff", fontSize: "0.9rem", fontWeight: 600 }}>
                {createAccountUserName}
              </p>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.45)", fontSize: "0.78rem", marginTop: 2 }}>
                Nueva cuenta de tipo <strong style={{ color: "#a855f7" }}>Inversión</strong>
              </p>
            </div>
          </div>
          <form onSubmit={handleCreateAccountSubmit}>
            {fieldGroup("Nombre de la cuenta *", (
              <input
                style={inputStyle}
                value={createAccountName}
                onChange={(e) => setCreateAccountName(e.target.value)}
                placeholder='Ej. "Mi Segunda Cuenta de Inversión"'
                autoFocus
                required
              />
            ))}
            {fieldGroup("Monto inicial ($) — opcional", (
              <input
                type="number"
                step="0.01"
                min="0"
                value={createAccountAmount}
                onChange={(e) => setCreateAccountAmount(e.target.value)}
                placeholder="0.00  (dejar vacío para iniciar en $0)"
                style={inputStyle}
              />
            ))}
            {/* Casilla AR — solo visible si el usuario tiene rol general SOCIO */}
            {createAccountUserRole === "SOCIO" && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "12px 14px",
                  background: createAccountIsAR
                    ? "rgba(234,179,8,0.08)"
                    : "rgba(255,255,255,0.03)",
                  border: `1px solid ${createAccountIsAR ? "rgba(234,179,8,0.35)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onClick={() => setCreateAccountIsAR((v) => !v)}
              >
                {/* Checkbox visual */}
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    border: `2px solid ${createAccountIsAR ? "#eab308" : "rgba(255,255,255,0.25)"}`,
                    backgroundColor: createAccountIsAR ? "#eab308" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    transition: "all 0.2s",
                  }}
                >
                  {createAccountIsAR && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div>
                  <p style={{ margin: 0, color: createAccountIsAR ? "#eab308" : "#fff", fontSize: "0.88rem", fontWeight: 600 }}>
                    Cuenta de Alto Riesgo (AR)
                  </p>
                  <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: "0.75rem", marginTop: 2 }}>
                    Recibe rendimientos AR además de los normales
                  </p>
                </div>
              </div>
            )}
            {/* Nota informativa */}
            <div
              style={{
                padding: "10px 14px",
                background: "rgba(234,179,8,0.06)",
                border: "1px solid rgba(234,179,8,0.2)",
                borderRadius: "8px",
                marginBottom: "20px",
                fontSize: "0.8rem",
                color: "rgba(255,255,255,0.55)",
                lineHeight: 1.5,
              }}
            >
              ⚠️ Solo se pueden crear cuentas de <strong style={{ color: "#eab308" }}>Inversión</strong>.
              La cuenta de Ahorro ya existe desde el registro y no puede duplicarse.
              {createAccountAmount && parseFloat(createAccountAmount) > 0 && (
                <><br />El monto inicial se registrará como un <strong style={{ color: "#eab308" }}>Depósito</strong> en el historial.</>
              )}
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={closeModal}
                disabled={creatingAccount}
                style={{
                  padding: "10px 20px",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#aaa",
                  borderRadius: "8px",
                  cursor: creatingAccount ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  fontSize: "0.88rem",
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creatingAccount || !createAccountName.trim()}
                style={{
                  padding: "10px 24px",
                  background: creatingAccount
                    ? "rgba(168,85,247,0.3)"
                    : "linear-gradient(135deg, #a855f7, #7c3aed)",
                  border: "none",
                  color: "#fff",
                  borderRadius: "8px",
                  cursor: creatingAccount || !createAccountName.trim() ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: !createAccountName.trim() ? 0.5 : 1,
                }}
              >
                <PlusCircle size={14} />
                {creatingAccount ? "Creando..." : "Crear Cuenta"}
              </button>
            </div>
          </form>
        </ModalOverlay>
      )}

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ── Small action button component ──
function ActionBtn({
  icon,
  label,
  title,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "5px 10px",
        backgroundColor: `${color}14`,
        border: `1px solid ${color}40`,
        borderRadius: "6px",
        color,
        cursor: "pointer",
        fontSize: "0.78rem",
        fontWeight: 600,
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = `${color}28`;
        e.currentTarget.style.borderColor = `${color}80`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = `${color}14`;
        e.currentTarget.style.borderColor = `${color}40`;
      }}
    >
      {icon}
      {label}
    </button>
  );
}
