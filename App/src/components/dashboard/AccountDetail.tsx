"use client";

// ============================================================================
// ACCOUNT DETAIL — DETALLE COMPLETO DE UNA CUENTA FINANCIERA
// ============================================================================
// Client Component: hace fetch a GET /api/accounts/[id]/detail
// y renderiza información, transacciones recientes y acciones de la cuenta.
//
// MANEJO DE ERRORES:
//   - 404 → Empty state "Cuenta no encontrada"
//   - 403 → "No tienes permiso para ver esta cuenta"
//   - 500 → Error genérico con botón para volver
//
// SINCRONIZACIÓN:
//   - Llama a setViewedAccount(accountId) al montar, para mantener
//     consistencia con modales de transferencia/retiro.
//
// FASE 4.2 — ACCOUNT DETAIL
// ============================================================================

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@/contexts/AccountContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { PerformanceTable } from "@/components/dashboard/PerformanceTable";
import { DepositModal } from "@/components/dashboard/billetera/DepositModal";
import { WithdrawModal } from "@/components/dashboard/billetera/WithdrawModal";
import { InternalTransferModal } from "@/components/dashboard/billetera/InternalTransferModal";
import { checkWithdrawalWindowStatus } from "@/lib/actions/wallet-checks";
import {
  Landmark,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  MinusCircle,
  X,
  Pencil,
  Check,
} from "lucide-react";
import { updateAccountName } from "@/lib/actions/user-settings";

// ============================================================================
// TIPOS — espejo del contrato de GET /api/accounts/[id]/detail
// ============================================================================

type AccountType = "SAVINGS" | "INVESTMENT";
type AccountRole = "USER" | "SOCIO";

interface RecentTransaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  paymentId: string | null;
  createdAt: string;
}

interface AccountDetailData {
  id: string;
  name: string;
  type: AccountType;
  role: AccountRole;
  isHighRisk: boolean;
  userId: string;
  investedCapital: number;
  withdrawalLimitByDate: number | null;
  isDefaultReward: boolean;
  createdAt: string;
  updatedAt: string;
  recentTransactions: RecentTransaction[];
}

// ============================================================================
// CONSTANTES DE DISEÑO
// ============================================================================

const TYPE_META: Record<
  AccountType,
  { label: string; color: string; dimColor: string; borderColor: string; Icon: React.ElementType }
> = {
  SAVINGS: {
    label: "Ahorro",
    color: "#00c97a",
    dimColor: "rgba(0, 201, 122, 0.1)",
    borderColor: "rgba(0, 201, 122, 0.3)",
    Icon: Landmark,
  },
  INVESTMENT: {
    label: "Inversión",
    color: "#bd8e48",
    dimColor: "rgba(189, 142, 72, 0.1)",
    borderColor: "rgba(189, 142, 72, 0.3)",
    Icon: TrendingUp,
  },
};

// Labels y colores de status de transacción
const TX_STATUS_META: Record<
  string,
  { label: string; color: string; Icon: React.ElementType }
> = {
  COMPLETED: { label: "Completado", color: "#00c97a", Icon: CheckCircle2 },
  PENDING:   { label: "Pendiente",  color: "#bd8e48", Icon: Clock },
  FAILED:    { label: "Fallido",    color: "#e05c5c", Icon: XCircle },
  CANCELLED: { label: "Cancelado", color: "rgba(255,255,255,0.3)", Icon: MinusCircle },
};

// Labels de tipo de transacción
const TX_TYPE_LABEL: Record<string, string> = {
  DEPOSIT:           "Depósito",
  WITHDRAWAL:        "Retiro",
  TRANSFER_IN:       "Transferencia recibida",
  TRANSFER_OUT:      "Transferencia enviada",
  REWARD:            "Recompensa",
  INTERNAL_TRANSFER: "Transferencia interna",
};

// ============================================================================
// SUBCOMPONENTE: FILA DE TRANSACCIÓN
// ============================================================================

function TransactionRow({ tx }: { tx: RecentTransaction }) {
  const { formatAmount } = useCurrency();

  const statusMeta =
    TX_STATUS_META[tx.status] ?? { label: tx.status, color: "rgba(255,255,255,0.3)", Icon: MinusCircle };
  const { Icon: StatusIcon } = statusMeta;
  const typeLabel = TX_TYPE_LABEL[tx.type] ?? tx.type;

  const date = new Date(tx.createdAt);
  const formattedDate = date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const formattedTime = date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Determinar si es crédito o débito para colorear el monto
  const isCredit = ["DEPOSIT", "TRANSFER_IN", "REWARD"].includes(tx.type);
  const amountColor = isCredit ? "#00c97a" : "rgba(255,255,255,0.85)";
  const amountPrefix = isCredit ? "+" : tx.amount > 0 ? "−" : "";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
        padding: "14px 18px",
        borderRadius: "12px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        transition: "background 0.15s ease",
      }}
      className="tx-row"
    >
      {/* Icono de tipo */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "10px",
          background: isCredit ? "rgba(0,201,122,0.1)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${isCredit ? "rgba(0,201,122,0.2)" : "rgba(255,255,255,0.08)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {isCredit
          ? <ArrowDownLeft size={16} color="#00c97a" />
          : <ArrowUpRight size={16} color="rgba(255,255,255,0.4)" />}
      </div>

      {/* Tipo y fecha */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 500, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {typeLabel}
        </p>
        <p style={{ margin: "3px 0 0", fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>
          {formattedDate} · {formattedTime}
        </p>
      </div>

      {/* Status */}
      <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
        <StatusIcon size={13} color={statusMeta.color} />
        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: statusMeta.color, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {statusMeta.label}
        </span>
      </div>

      {/* Monto */}
      <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: amountColor, flexShrink: 0, minWidth: "90px", textAlign: "right" }}>
        {amountPrefix}{formatAmount(tx.amount)}
      </p>

      <style>{`.tx-row:hover { background: rgba(255,255,255,0.045) !important; }`}</style>
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTE: BOTÓN DE ACCIÓN
// ============================================================================

interface ActionButtonProps {
  label: string;
  icon: React.ElementType;
  accentColor: string;
  dimColor: string;
  borderColor: string;
  onClick?: () => void;
  disabled?: boolean;
}

function ActionButton({ label, icon: Icon, accentColor, dimColor, borderColor, onClick, disabled }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className="acct-action-btn"
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        padding: "16px 12px",
        borderRadius: "14px",
        background: dimColor,
        border: `1px solid ${borderColor}`,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        color: accentColor,
        transition: "opacity 0.15s ease, transform 0.15s ease, background 0.15s ease",
      }}
    >
      <Icon size={20} color={accentColor} />
      <span style={{ fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.3px" }}>
        {label}
      </span>
      <style>{`
        .acct-action-btn:not(:disabled):hover {
          opacity: 1 !important;
          transform: translateY(-2px);
        }
        .acct-action-btn:not(:disabled):active { transform: translateY(0); }
      `}</style>
    </button>
  );
}

// ============================================================================
// SUBCOMPONENTE: TOAST INLINE
// ============================================================================

interface InlineToastProps {
  message: string;
  type: "success" | "error";
  onDismiss: () => void;
}

function InlineToast({ message, type, onDismiss }: InlineToastProps) {
  const isSuccess = type === "success";
  return (
    <div
      style={{
        position: "fixed",
        bottom: "28px",
        right: "24px",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "14px 20px",
        borderRadius: "14px",
        background: isSuccess ? "rgba(0,201,122,0.12)" : "rgba(224,92,92,0.12)",
        border: `1px solid ${isSuccess ? "rgba(0,201,122,0.35)" : "rgba(224,92,92,0.35)"}`,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        backdropFilter: "blur(12px)",
        maxWidth: "360px",
        animation: "slideUp 0.25s ease-out",
      }}
    >
      {isSuccess
        ? <CheckCircle2 size={18} color="#00c97a" style={{ flexShrink: 0 }} />
        : <AlertTriangle size={18} color="#e05c5c" style={{ flexShrink: 0 }} />}
      <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#fff", flex: 1 }}>
        {message}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "rgba(255,255,255,0.4)" }}
      >
        <X size={14} />
      </button>
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTE: ESTADO DE ERROR
// ============================================================================

function ErrorState({
  title,
  description,
  onBack,
}: {
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        padding: "64px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "16px",
          background: "rgba(224,92,92,0.1)",
          border: "1px solid rgba(224,92,92,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AlertTriangle size={26} color="#e05c5c" />
      </div>

      <div>
        <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
          {title}
        </h2>
        <p style={{ margin: "6px 0 0", fontSize: "0.875rem", color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={onBack}
        style={{
          marginTop: "8px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 20px",
          borderRadius: "10px",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "rgba(255,255,255,0.7)",
          fontSize: "0.875rem",
          fontWeight: 600,
          cursor: "pointer",
          transition: "background 0.15s ease",
        }}
      >
        <ArrowLeft size={15} />
        Volver al Dashboard
      </button>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

interface AccountDetailProps {
  accountId: string;
}

export function AccountDetail({ accountId }: AccountDetailProps) {
  const router = useRouter();
  const { setViewedAccount, refreshAccounts } = useAccount();
  const { formatAmount } = useCurrency();

  // ── Estado de datos ────────────────────────────────────────────────────────
  const [data, setData] = useState<AccountDetailData | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // ── Estado de modales ──────────────────────────────────────────────────────
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferDirection, setTransferDirection] = useState<"TO_INVESTMENT" | "TO_SAVINGS">("TO_INVESTMENT");
  const [withdrawalWindow, setWithdrawalWindow] = useState<{ isOpen: boolean; reason?: string }>({ isOpen: true });

  // ── Estado del mes seleccionado (afecta tabla y gráfica) ──────────────────
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // ── Estado de toast inline ─────────────────────────────────────────────────
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Estado de edición de nombre ─────────────────────────────────────────────
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  const handleSaveName = async () => {
    if (!newName.trim() || newName.trim() === data?.name) {
      setIsEditingName(false);
      return;
    }
    setIsSavingName(true);
    const res = await updateAccountName(accountId, newName.trim());
    setIsSavingName(false);
    
    if (res.success) {
      showToast(res.message, "success");
      setData((prev) => prev ? { ...prev, name: newName.trim() } : prev);
      refreshAccounts();
      setIsEditingName(false);
    } else {
      showToast(res.message, "error");
    }
  };

  // ── Sincronización con contexto (CRÍTICO) ──────────────────────────────────
  // Garantiza que modales de transferencia/retiro usen esta cuenta como activa.
  useEffect(() => {
    setViewedAccount(accountId);
  }, [accountId, setViewedAccount]);

  // ── Cargar estado de ventana de retiros ────────────────────────────────────
  useEffect(() => {
    checkWithdrawalWindowStatus().then(setWithdrawalWindow);
  }, []);

  // ── Fetch de datos ─────────────────────────────────────────────────────────
  const fetchDetail = useCallback(async () => {
    setIsLoading(true);
    setErrorStatus(null);
    setErrorMessage("");

    try {
      const res = await fetch(`/api/accounts/${accountId}/detail`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorStatus(res.status);
        setErrorMessage(body.error ?? "Error desconocido");
        return;
      }

      const json: AccountDetailData = await res.json();
      setData(json);
    } catch {
      setErrorStatus(500);
      setErrorMessage("No se pudo conectar al servidor.");
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // ── Handlers de éxito de modales ──────────────────────────────────────────
  // refreshAccounts() sincroniza el contexto global sin navegar ni recargar.
  const handleActionSuccess = useCallback(async (message: string) => {
    await refreshAccounts();
    await fetchDetail(); // Refresca datos locales (capital, transacciones)
    showToast(message);
  }, [refreshAccounts, fetchDetail, showToast]);

  // ── Helper de navegación ───────────────────────────────────────────────────
  const goToDashboard = () => router.push("/dashboard");
  const goBack        = () => router.push("/dashboard/cuentas");

  // ── Estados: loading ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "64px 0", color: "rgba(255,255,255,0.3)", fontSize: "0.9rem" }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
        <span>Cargando cuenta…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Estado: 404 ───────────────────────────────────────────────────────────
  if (errorStatus === 404) {
    return (
      <ErrorState
        title="Cuenta no encontrada"
        description="Es posible que la cuenta haya sido eliminada o el enlace sea incorrecto."
        onBack={goToDashboard}
      />
    );
  }

  // ── Estado: 403 ──────────────────────────────────────────────────────────
  if (errorStatus === 403) {
    return (
      <ErrorState
        title="Acceso denegado"
        description="No tienes permiso para ver esta cuenta."
        onBack={goToDashboard}
      />
    );
  }

  // ── Estado: error genérico ────────────────────────────────────────────────
  if (errorStatus !== null || !data) {
    return (
      <ErrorState
        title="Error inesperado"
        description={errorMessage || "Intenta nuevamente en unos momentos."}
        onBack={goToDashboard}
      />
    );
  }

  // ── Render principal ──────────────────────────────────────────────────────
  const typeMeta = TYPE_META[data.type];
  const { Icon: TypeIcon } = typeMeta;

  const createdAt = new Date(data.createdAt).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

      {/* — Botón volver — */}
      <button
        type="button"
        onClick={goBack}
        style={{
          alignSelf: "flex-start",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "7px 14px",
          borderRadius: "8px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "rgba(255,255,255,0.5)",
          fontSize: "0.8rem",
          fontWeight: 500,
          cursor: "pointer",
          transition: "background 0.15s ease, color 0.15s ease",
        }}
        className="back-btn"
      >
        <ArrowLeft size={14} />
        Mis cuentas
        <style>{`.back-btn:hover { background: rgba(255,255,255,0.08) !important; color: rgba(255,255,255,0.8) !important; }`}</style>
      </button>

      {/* ══ HEADER: Nombre, badge de tipo, capital ══ */}
      <div
        style={{
          padding: "28px 32px",
          borderRadius: "20px",
          background: "#080808",
          border: `1px solid ${typeMeta.borderColor}`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow sutil */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at top left, ${typeMeta.dimColor} 0%, transparent 65%)`,
            pointerEvents: "none",
            borderRadius: "20px",
          }}
        />

        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: "18px" }}>

          {/* Icono + badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "14px",
                background: typeMeta.dimColor,
                border: `1px solid ${typeMeta.borderColor}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <TypeIcon size={22} color={typeMeta.color} />
            </div>

            {/* Badge dinámico por tipo */}
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                color: typeMeta.color,
                background: typeMeta.dimColor,
                border: `1px solid ${typeMeta.borderColor}`,
                borderRadius: "6px",
                padding: "4px 12px",
              }}
            >
              {typeMeta.label}
            </span>
          </div>

          {/* Nombre */}
          <div>
            {isEditingName ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={isSavingName}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") setIsEditingName(false);
                  }}
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: 800,
                    color: "#FFFFFF",
                    letterSpacing: "-0.4px",
                    background: "transparent",
                    border: "none",
                    borderBottom: `2px solid ${typeMeta.color}`,
                    outline: "none",
                    padding: 0,
                    margin: 0,
                    width: "100%",
                    maxWidth: "300px",
                  }}
                />
                <button
                  onClick={handleSaveName}
                  disabled={isSavingName}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
                >
                  <Check size={20} color="#00c97a" />
                </button>
                <button
                  onClick={() => setIsEditingName(false)}
                  disabled={isSavingName}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
                >
                  <X size={20} color="rgba(255,255,255,0.4)" />
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "1.5rem",
                    fontWeight: 800,
                    color: "#FFFFFF",
                    letterSpacing: "-0.4px",
                  }}
                >
                  {data.name}
                </h1>
                {data.type === "INVESTMENT" && (
                  <button
                    onClick={() => {
                      setNewName(data.name);
                      setIsEditingName(true);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: 0.5,
                      transition: "opacity 0.2s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = "0.5"}
                    title="Editar nombre de la cuenta"
                  >
                    <Pencil size={16} color="#FFFFFF" />
                  </button>
                )}
              </div>
            )}
            <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>
              Creada el {createdAt}
            </p>
          </div>

          {/* Capital */}
          <div>
            <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              Capital invertido
            </p>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "2.4rem",
                fontWeight: 800,
                color: "#FFFFFF",
                letterSpacing: "-1px",
                lineHeight: 1.1,
              }}
            >
              {formatAmount(data.investedCapital)}
            </p>
            {data.withdrawalLimitByDate !== null && (
              <p style={{ margin: "6px 0 0", fontSize: "0.78rem", color: "rgba(255,255,255,0.3)" }}>
                Límite de retiro: {formatAmount(data.withdrawalLimitByDate)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ══ PERFORMANCE CHART — Fase 4.3 ══ */}
      <PerformanceChart
        accountId={accountId}
        accountType={data.type}
        isHighRisk={!!data.isHighRisk}
        accountCreatedAt={data.createdAt}
        selectedMonth={selectedMonth}
        onMonthChange={data.type === "INVESTMENT" ? setSelectedMonth : undefined}
      />

      {/* ══ TABLA DE RENDIMIENTOS — solo Inversión ══ */}
      {data.type === "INVESTMENT" && (
        <PerformanceTable
          isHighRisk={!!data.isHighRisk}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
        />
      )}

      {/* ══ ACCIONES — Fase 4.4 ══ */}
      <div>
        <p style={{ margin: "0 0 12px 2px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.1px", color: "rgba(255,255,255,0.25)" }}>
          Acciones
        </p>
        <div style={{ display: "flex", gap: "12px" }}>
          {/* Depositar: abre DepositModal — respeta DEPOSITS_ENABLED=false */}
          <ActionButton
            label="Depositar"
            icon={ArrowDownLeft}
            accentColor="#00c97a"
            dimColor="rgba(0,201,122,0.07)"
            borderColor="rgba(0,201,122,0.2)"
            onClick={() => setIsDepositOpen(true)}
          />
          {/* Transferir: dirección según tipo de cuenta */}
          <ActionButton
            label="Transferir"
            icon={ArrowLeftRight}
            accentColor="#bd8e48"
            dimColor="rgba(189,142,72,0.07)"
            borderColor="rgba(189,142,72,0.2)"
            onClick={() => {
              setTransferDirection(
                data.type === "INVESTMENT" ? "TO_SAVINGS" : "TO_INVESTMENT"
              );
              setIsTransferOpen(true);
            }}
          />
          {/* Retirar: solo disponible en cuentas de Ahorros */}
          {data.type === "SAVINGS" && (
            <ActionButton
              label="Retirar"
              icon={ArrowUpRight}
              accentColor="rgba(255,255,255,0.55)"
              dimColor="rgba(255,255,255,0.03)"
              borderColor="rgba(255,255,255,0.08)"
              onClick={() => setIsWithdrawOpen(true)}
            />
          )}
        </div>
      </div>

      {/* ══ TRANSACCIONES RECIENTES ══ */}
      <div>
        <p style={{ margin: "0 0 12px 2px", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.1px", color: "rgba(255,255,255,0.25)" }}>
          Transacciones recientes
        </p>

        {data.recentTransactions.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
              padding: "40px 24px",
              borderRadius: "14px",
              border: "1px dashed rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.25)",
              textAlign: "center",
            }}
          >
            <Clock size={28} color="rgba(255,255,255,0.15)" />
            <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 500 }}>
              Sin movimientos aún
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {data.recentTransactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </div>

      {/* ══ MODALES — Fase 4.4 ══ */}

      {/* Depositar: DEPOSITS_ENABLED=false en el modal → muestra "no disponible" automáticamente */}
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onSuccess={() => setIsDepositOpen(false)}
      />

      {/* Retirar: opera sobre accountId actual; balance viene de data */}
      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        availableBalance={data.investedCapital}
        accountId={accountId}
        onSuccess={async () => {
          setIsWithdrawOpen(false);
          await handleActionSuccess("Solicitud de retiro enviada correctamente.");
        }}
      />

      {/* Transferir: defaultInvestmentAccountId = accountId para preselección */}
      <InternalTransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        direction={transferDirection}
        isBlocked={!withdrawalWindow.isOpen}
        defaultInvestmentAccountId={data.type === "INVESTMENT" ? accountId : undefined}
        onSuccess={async () => {
          setIsTransferOpen(false);
          await handleActionSuccess("Transferencia realizada correctamente.");
        }}
      />

      {/* Toast inline de feedback */}
      {toast && (
        <InlineToast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
