"use client";
// ============================================================================
// PÁGINA: REFERIDOS — PRO-FINANCE
// ============================================================================
// Página global al usuario. No depende de la cuenta activa (AccountContext).
// Muestra: código de referido copiable, estadísticas y tabla de referidos.
// ============================================================================

import React, { useState, useEffect, useCallback } from "react";
import { Copy, Check, Users, UserCheck, DollarSign, Clock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { formatCurrency } from "@/lib/utils/currency";
import { logger } from "@/lib/logger";

// ============================================================================
// TIPOS
// ============================================================================

interface ReferralStats {
    total: number;
    active: number;
    totalEarnings: number;
}

interface ReferralItem {
    id: string;
    referredId: string;
    status: "PENDING" | "ACTIVE";
    createdAt: string;
    activatedAt: string | null;
    totalRewards: number;
    currency: string | null;
}

interface ReferralData {
    referralCode: string | null;
    referralLink: string | null;
    stats: ReferralStats;
    referrals: ReferralItem[];
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function ReferidosPage() {
    const [data, setData] = useState<ReferralData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await fetch("/api/referrals");
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (error) {
            logger.error("Error cargando referidos:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCopy = () => {
        if (!data?.referralLink) return;
        navigator.clipboard.writeText(data.referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    // ── LOADING ──────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <PageHeader
                    title="Referidos"
                    subtitle="Invita amigos y gana comisiones por sus inversiones."
                />
                <div
                    style={{
                        background: "#080808",
                        border: "1px solid rgba(189, 142, 72, 0.3)",
                        borderRadius: "24px",
                        padding: "60px",
                        textAlign: "center",
                        color: "rgba(255,255,255,0.4)",
                    }}
                >
                    Cargando...
                </div>
            </div>
        );
    }

    // ── RENDER ────────────────────────────────────────────────────────────────
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <PageHeader
                title="Referidos"
                subtitle="Invita amigos y gana el 5% de su primera inversión."
            />

            {/* ── SECCIÓN: LINK DE REFERIDO ──────────────────────────────────── */}
            <div
                style={{
                    background: "#080808",
                    border: "1px solid rgba(189, 142, 72, 0.3)",
                    borderRadius: "24px",
                    padding: "30px",
                }}
            >
                <h3
                    style={{
                        color: "rgba(189, 142, 72, 0.8)",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        margin: "0 0 20px 0",
                    }}
                >
                    Tu Enlace de Referido
                </h3>

                {data?.referralLink ? (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            flexWrap: "wrap",
                        }}
                    >
                        <div
                            style={{
                                flex: 1,
                                minWidth: "200px",
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(189, 142, 72, 0.2)",
                                borderRadius: "12px",
                                padding: "14px 18px",
                                fontFamily: "monospace",
                                fontSize: "0.9rem",
                                color: "rgba(255,255,255,0.7)",
                                wordBreak: "break-all",
                            }}
                        >
                            {data.referralLink}
                        </div>
                        <button
                            onClick={handleCopy}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "14px 22px",
                                background: copied
                                    ? "rgba(76, 175, 80, 0.15)"
                                    : "rgba(189, 142, 72, 0.12)",
                                border: `1px solid ${copied ? "rgba(76,175,80,0.4)" : "rgba(189,142,72,0.4)"}`,
                                borderRadius: "12px",
                                color: copied ? "#4caf50" : "#bd8e48",
                                cursor: "pointer",
                                fontSize: "0.9rem",
                                fontWeight: 600,
                                transition: "all 0.3s",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {copied ? (
                                <>
                                    <Check size={16} />
                                    ¡Copiado!
                                </>
                            ) : (
                                <>
                                    <Copy size={16} />
                                    Copiar enlace
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    <p style={{ color: "rgba(255,255,255,0.4)", margin: 0 }}>
                        Tu código de referido se generará automáticamente.
                    </p>
                )}

                {data?.referralCode && (
                    <p
                        style={{
                            color: "rgba(255,255,255,0.35)",
                            fontSize: "0.8rem",
                            margin: "12px 0 0 0",
                        }}
                    >
                        Código:{" "}
                        <span
                            style={{
                                fontFamily: "monospace",
                                color: "#bd8e48",
                                fontWeight: 700,
                                letterSpacing: "2px",
                            }}
                        >
                            {data.referralCode}
                        </span>
                    </p>
                )}
            </div>

            {/* ── SECCIÓN: ESTADÍSTICAS ──────────────────────────────────────── */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "16px",
                }}
            >
                {/* Stat: Total referidos */}
                <StatCard
                    icon={<Users size={22} color="#bd8e48" />}
                    label="Total Referidos"
                    value={String(data?.stats.total ?? 0)}
                />
                {/* Stat: Activos */}
                <StatCard
                    icon={<UserCheck size={22} color="#4caf50" />}
                    label="Referidos Activos"
                    value={String(data?.stats.active ?? 0)}
                    valueColor="#4caf50"
                />
                {/* Stat: Comisiones */}
                <StatCard
                    icon={<DollarSign size={22} color="#bd8e48" />}
                    label="Comisiones Ganadas"
                    value={formatCurrency(data?.stats.totalEarnings ?? 0)}
                    valueColor="#bd8e48"
                />
            </div>

            {/* ── SECCIÓN: TABLA DE REFERIDOS ────────────────────────────────── */}
            <div
                style={{
                    background: "#080808",
                    border: "1px solid rgba(189, 142, 72, 0.3)",
                    borderRadius: "24px",
                    padding: "30px",
                }}
            >
                <h3
                    style={{
                        color: "rgba(189, 142, 72, 0.8)",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        margin: "0 0 24px 0",
                    }}
                >
                    Historial de Referidos
                </h3>

                {!data?.referrals || data.referrals.length === 0 ? (
                    <div
                        style={{
                            textAlign: "center",
                            padding: "60px 20px",
                            color: "rgba(255,255,255,0.3)",
                        }}
                    >
                        <Users size={40} style={{ marginBottom: "12px", opacity: 0.3 }} />
                        <p style={{ fontSize: "1rem", margin: 0 }}>
                            Aún no has referido a nadie
                        </p>
                        <p style={{ fontSize: "0.85rem", margin: "8px 0 0 0" }}>
                            Comparte tu enlace para comenzar a ganar comisiones
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                fontSize: "0.9rem",
                            }}
                        >
                            <thead>
                                <tr>
                                    {["ID Referido", "Fecha", "Estado", "Comisión"].map(
                                        (col) => (
                                            <th
                                                key={col}
                                                style={{
                                                    textAlign: "left",
                                                    padding: "10px 16px",
                                                    color: "rgba(255,255,255,0.35)",
                                                    fontWeight: 600,
                                                    fontSize: "0.75rem",
                                                    textTransform: "uppercase",
                                                    letterSpacing: "0.5px",
                                                    borderBottom: "1px solid rgba(189,142,72,0.15)",
                                                }}
                                            >
                                                {col}
                                            </th>
                                        )
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {data.referrals.map((ref) => (
                                    <tr
                                        key={ref.id}
                                        style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                                    >
                                        {/* ID parcial */}
                                        <td
                                            style={{
                                                padding: "14px 16px",
                                                color: "rgba(255,255,255,0.5)",
                                                fontFamily: "monospace",
                                                fontSize: "0.8rem",
                                            }}
                                        >
                                            {ref.referredId.slice(0, 8)}…
                                        </td>

                                        {/* Fecha */}
                                        <td
                                            style={{
                                                padding: "14px 16px",
                                                color: "rgba(255,255,255,0.5)",
                                                fontSize: "0.85rem",
                                            }}
                                        >
                                            {new Date(ref.createdAt).toLocaleDateString("es-ES", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </td>

                                        {/* Estado */}
                                        <td style={{ padding: "14px 16px" }}>
                                            <StatusBadge status={ref.status} />
                                        </td>

                                        {/* Comisión */}
                                        <td
                                            style={{
                                                padding: "14px 16px",
                                                color:
                                                    ref.totalRewards > 0 ? "#4caf50" : "rgba(255,255,255,0.3)",
                                                fontWeight: 700,
                                                fontSize: "0.95rem",
                                            }}
                                        >
                                            {ref.totalRewards > 0
                                                ? `+${formatCurrency(ref.totalRewards)}`
                                                : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// SUBCOMPONENTES
// ============================================================================

function StatCard({
    icon,
    label,
    value,
    valueColor = "#fff",
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    valueColor?: string;
}) {
    return (
        <div
            style={{
                background: "#080808",
                border: "1px solid rgba(189, 142, 72, 0.3)",
                borderRadius: "20px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
            }}
        >
            <div
                style={{
                    width: "44px",
                    height: "44px",
                    background: "rgba(189, 142, 72, 0.08)",
                    border: "1px solid rgba(189, 142, 72, 0.2)",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {icon}
            </div>
            <div>
                <p
                    style={{
                        color: "rgba(255,255,255,0.4)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        margin: "0 0 4px 0",
                    }}
                >
                    {label}
                </p>
                <p
                    style={{
                        color: valueColor,
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        margin: 0,
                    }}
                >
                    {value}
                </p>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: "PENDING" | "ACTIVE" }) {
    const isActive = status === "ACTIVE";
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 12px",
                borderRadius: "8px",
                fontSize: "0.75rem",
                fontWeight: 600,
                background: isActive
                    ? "rgba(76, 175, 80, 0.1)"
                    : "rgba(255, 152, 0, 0.1)",
                border: `1px solid ${isActive ? "rgba(76,175,80,0.3)" : "rgba(255,152,0,0.3)"}`,
                color: isActive ? "#4caf50" : "#ff9800",
            }}
        >
            {isActive ? (
                <UserCheck size={12} />
            ) : (
                <Clock size={12} />
            )}
            {isActive ? "Activo" : "Pendiente"}
        </span>
    );
}
