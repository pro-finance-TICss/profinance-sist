"use client";

import React, { useState, useCallback } from "react";
import { X, ChevronRight, ChevronLeft, History, Check, AlertTriangle, Loader2 } from "lucide-react";
import { HistoricalMonthRow, type RowState } from "./HistoricalMonthRow";
import { saveHistoricalSnapshots } from "@/lib/actions/historical-recalculation";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface AccountInfo {
  id: string;
  name: string;
  investedCapital: number;
  /** ISO string de la fecha de creación actual de la cuenta */
  createdAt: string;
}

interface PrefillMonth {
  month: string;
  periodStart: string;
  periodEnd: string;
  performances: { performanceId: string; label: string; userPercentage: number; date: string }[];
  totalUserPercentage: number;
  suggestedCapitalBase: number;
  suggestedGainAmount: number;
  suggestedCapitalEnd: number;
}

interface Props {
  account: AccountInfo;
  onClose: () => void;
  onSuccess: () => void;
}

// ── Colores ───────────────────────────────────────────────────────────────────
const GOLD  = "#bd8e48";
const GREEN = "#00c97a";
const RED   = "#e05c5c";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

// ── Wizard ────────────────────────────────────────────────────────────────────

export function HistoricalWizard({ account, onClose, onSuccess }: Props) {
  const [step, setStep]             = useState<1 | 2 | 3>(1);
  const [fromMonth, setFromMonth]   = useState("");
  const [fromDay, setFromDay]       = useState("1"); // día de inicio dentro del primer mes
  const baseCapital = Math.round(account.investedCapital * 100) / 100;
  const [initialCapital, setInitialCapital] = useState(baseCapital);
  const [localCapitalStr, setLocalCapitalStr] = useState(String(baseCapital));
  const [rows, setRows]             = useState<RowState[]>([]);
  const [updateCapital, setUpdateCapital] = useState(true);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [result, setResult]         = useState<{ snapshotsCreated: number; capitalFinal: number } | null>(null);

  // ¿El mes elegido es anterior al mes de creación actual?
  const accountCreatedYM = account.createdAt.substring(0, 7); // "YYYY-MM"
  const isBackdating = fromMonth !== "" && fromMonth < accountCreatedYM;

  // ── Paso 1 → 2: cargar prefill desde la API ──────────────────────────────
  const handleLoadPrefill = useCallback(async () => {
    setError(null);
    if (!fromMonth) { setError("Selecciona el mes de inicio"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/accounts/${account.id}/historical?from=${fromMonth}`);
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Error al cargar datos"); setLoading(false); return; }

      // Construir RowState desde el prefill, usando initialCapital en el primer mes
      const prefillMonths: PrefillMonth[] = json.months;
      const built: RowState[] = prefillMonths.map((m, i) => {
        const suggestedCapital = i === 0 ? initialCapital : 0; // se recalcula abajo
        return {
          month: m.month,
          periodStart: m.periodStart,
          periodEnd: m.periodEnd,
          performances: m.performances,
          userPercentage: m.totalUserPercentage,
          capitalBase: m.suggestedCapitalBase,
          suggestedCapital: m.suggestedCapitalBase,
          isManualCapital: false,
          note: "",
        };
      });

      // Recalcular con el capitalInicial ingresado por el superadmin
      let running = initialCapital;
      const recalculated = built.map((row) => {
        const base = Math.round(running * 100) / 100;
        const gain = base * (row.userPercentage / 100);
        running = Math.round((base + gain) * 100) / 100;
        return { ...row, capitalBase: base, suggestedCapital: base };
      });

      setRows(recalculated);
      setStep(2);
    } catch {
      setError("Error de conexión al cargar el prefill");
    } finally {
      setLoading(false);
    }
  }, [account.id, fromMonth, initialCapital]);

  // ── Cambio de fila en el paso 2 ──────────────────────────────────────────
  const handleRowChange = useCallback((index: number, updated: Partial<RowState>) => {
    setRows((prev) => {
      const next = [...prev];
      const oldRow = next[index];
      next[index] = { ...oldRow, ...updated };

      // Si solo se actualizó la nota o algún campo que no afecta el balance,
      // evitamos recalcular todas las filas siguientes (ahorro de renders)
      const needsPropagation = 
        updated.capitalBase !== undefined || 
        updated.userPercentage !== undefined;

      if (!needsPropagation) return next;

      // Propagar el capital hacia adelante si NO están marcados como manual
      let running = Math.round((next[index].capitalBase + next[index].capitalBase * (next[index].userPercentage / 100)) * 100) / 100;
      for (let i = index + 1; i < next.length; i++) {
        if (!next[i].isManualCapital) {
          next[i] = { ...next[i], capitalBase: running, suggestedCapital: running };
        }
        running = Math.round((next[i].capitalBase + next[i].capitalBase * (next[i].userPercentage / 100)) * 100) / 100;
      }
      return next;
    });
  }, []);

  // ── Guardar (Paso 3) ─────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Limpiar campos UI-only antes de enviar al server action
    // Next.js no puede serializar objetos con campos extra no serializables
    const entries = rows.map((r) => ({
      month: r.month,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      capitalBase: r.capitalBase,
      userPercentage: r.userPercentage,
      gainAmount: r.capitalBase * (r.userPercentage / 100),
      performanceIds: r.performances?.map((p) => p.performanceId) ?? [],
      note: r.note ?? undefined,
    }));

    const res = await saveHistoricalSnapshots(
      account.id,
      entries,
      updateCapital,
      // Si se está retrocediendo la fecha, pasar la nueva fecha de creación
      isBackdating && fromMonth
        ? `${fromMonth}-${String(Math.min(Math.max(parseInt(fromDay) || 1, 1), 31)).padStart(2, "0")}T05:00:00.000Z`
        : undefined
    );
    setLoading(false);
    if (!res.success) { setError(res.message); return; }
    setResult({ snapshotsCreated: res.snapshotsCreated ?? 0, capitalFinal: res.capitalFinal ?? 0 });
    setStep(3);
  }, [account.id, rows, updateCapital, isBackdating, fromMonth, fromDay]);

  // ── Totales para resumen ─────────────────────────────────────────────────
  const totalGain    = rows.reduce((s, r) => s + r.capitalBase * (r.userPercentage / 100), 0);
  const lastCapital  = rows.length > 0
    ? rows[rows.length - 1].capitalBase + rows[rows.length - 1].capitalBase * (rows[rows.length - 1].userPercentage / 100)
    : 0;

  // ── Estilos reutilizables ─────────────────────────────────────────────────
  const card: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 3000,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
  };
  const modal: React.CSSProperties = {
    background: "#0e0e0f",
    border: "1px solid rgba(189,142,72,0.25)",
    borderRadius: 20,
    width: "min(96vw, 1000px)",
    maxHeight: "90vh",
    display: "flex", flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
  };
  const btnPrimary: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 8,
    padding: "10px 24px", borderRadius: 10,
    background: GOLD, border: "none",
    color: "#000", fontWeight: 700, fontSize: "0.9rem",
    cursor: "pointer",
  };
  const btnSecondary: React.CSSProperties = {
    ...btnPrimary,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.7)",
  };
  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10, color: "#fff",
    fontSize: "1rem", fontWeight: 600,
    padding: "10px 14px", outline: "none", width: "100%",
  };

  // ── Header del modal ──────────────────────────────────────────────────────
  const Header = (
    <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(189,142,72,0.12)", border: "1px solid rgba(189,142,72,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <History size={18} color={GOLD} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#fff" }}>Carga Histórica</p>
        <p style={{ margin: 0, fontSize: "0.78rem", color: "rgba(255,255,255,0.35)" }}>{account.name} · Paso {step} de 3</p>
      </div>
      {/* Indicador de pasos */}
      <div style={{ display: "flex", gap: 6 }}>
        {[1, 2, 3].map((s) => (
          <div key={s} style={{ width: 28, height: 4, borderRadius: 2, background: s <= step ? GOLD : "rgba(255,255,255,0.1)", transition: "background 0.3s" }} />
        ))}
      </div>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", marginLeft: 8 }}>
        <X size={20} />
      </button>
    </div>
  );

  // ── PASO 1: Configuración ─────────────────────────────────────────────────
  if (step === 1) return (
    <div style={card}>
      <div style={{ ...modal, maxWidth: 500 }}>
        {Header}
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: "0.875rem", lineHeight: 1.6 }}>
            Define desde qué mes comenzar a cargar el historial y el capital inicial de ese primer mes.
          </p>

          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Mes de inicio
            </label>
            <input type="month" value={fromMonth}
              onChange={(e) => { setFromMonth(e.target.value); setFromDay("1"); }}
              max={new Date().toISOString().substring(0, 7)}
              style={{ ...inputStyle, marginTop: 6 }} />
          </div>

          {/* Día de creación: solo aparece cuando se retrocede la fecha de la cuenta */}
          {isBackdating && (
            <div style={{ padding: "14px", background: "rgba(189,142,72,0.07)", border: "1px solid rgba(189,142,72,0.25)", borderRadius: 10 }}>
              <p style={{ margin: "0 0 10px", fontSize: "0.78rem", color: "rgba(189,142,72,0.9)", lineHeight: 1.5 }}>
                ⚠️ Este mes es anterior a la creación actual de la cuenta
                ({new Date(account.createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}).
                El sistema actualizará la fecha de apertura de la cuenta al día que indiques aquí.
              </p>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Día de apertura de cuenta en {fromMonth}
              </label>
              <input
                type="number" min={1} max={31} step={1}
                value={fromDay}
                onChange={(e) => setFromDay(e.target.value)}
                onBlur={() => {
                  const d = Math.min(Math.max(parseInt(fromDay) || 1, 1), 31);
                  setFromDay(String(d));
                }}
                placeholder="Ej: 15"
                style={{ ...inputStyle, marginTop: 6 }}
              />
              <p style={{ margin: "6px 0 0", fontSize: "0.72rem", color: "rgba(255,255,255,0.25)" }}>
                La fecha de apertura quedará registrada como {fromMonth}-{String(fromDay).padStart(2, "0")}
              </p>
            </div>
          )}

          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Capital al inicio de ese primer mes (USD)
            </label>
            <input type="number" min={0} step={0.01} value={localCapitalStr}
              onChange={(e) => setLocalCapitalStr(e.target.value)}
              onBlur={() => {
                const val = Math.round((parseFloat(localCapitalStr) || 0) * 100) / 100;
                setLocalCapitalStr(String(val));
                setInitialCapital(val);
              }}
              style={{ ...inputStyle, marginTop: 6 }} />
            <p style={{ margin: "6px 0 0", fontSize: "0.72rem", color: "rgba(255,255,255,0.25)" }}>
              Capital actual en sistema: ${fmt(account.investedCapital)}
            </p>
          </div>

          {error && (
            <div style={{ display: "flex", gap: 8, padding: "10px 14px", background: "rgba(224,92,92,0.1)", border: "1px solid rgba(224,92,92,0.3)", borderRadius: 10 }}>
              <AlertTriangle size={16} color={RED} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: "0.85rem", color: RED }}>{error}</span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button style={btnSecondary} onClick={onClose}>Cancelar</button>
            <button style={btnPrimary} onClick={handleLoadPrefill} disabled={loading}>
              {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <ChevronRight size={16} />}
              {loading ? "Cargando..." : "Siguiente"}
            </button>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  // ── PASO 2: Tabla editable ────────────────────────────────────────────────
  if (step === 2) return (
    <div style={card}>
      <div style={modal}>
        {Header}
        <div style={{ overflowY: "auto", flex: 1 }}>
          <div style={{ padding: "14px 24px", background: "rgba(189,142,72,0.04)", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div><p style={{ margin: 0, fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Meses</p><p style={{ margin: 0, fontWeight: 700, color: "#fff" }}>{rows.length}</p></div>
            <div><p style={{ margin: 0, fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Capital inicial</p><p style={{ margin: 0, fontWeight: 700, color: "#fff" }}>${fmt(initialCapital)}</p></div>
            <div><p style={{ margin: 0, fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Ganancia total</p><p style={{ margin: 0, fontWeight: 700, color: totalGain >= 0 ? GREEN : RED }}>{totalGain >= 0 ? "+" : ""}${fmt(totalGain)}</p></div>
            <div><p style={{ margin: 0, fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Capital final</p><p style={{ margin: 0, fontWeight: 700, color: GOLD }}>${fmt(lastCapital)}</p></div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {["Mes", "Capital base ($)", "% Usuario", "$ Ganado", "Capital final", "Nota"].map((h) => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <HistoricalMonthRow key={row.month} row={row} index={i} onChange={handleRowChange} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "space-between" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <div style={{ width: 36, height: 20, borderRadius: 10, background: updateCapital ? GOLD : "rgba(255,255,255,0.1)", border: `1px solid ${updateCapital ? GOLD : "rgba(255,255,255,0.15)"}`, position: "relative", transition: "background 0.2s", cursor: "pointer" }}
              onClick={() => setUpdateCapital(!updateCapital)}>
              <div style={{ position: "absolute", top: 2, left: updateCapital ? 18 : 2, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
            </div>
            <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.6)" }}>Actualizar capital de la cuenta al valor final (${fmt(lastCapital)})</span>
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={btnSecondary} onClick={() => setStep(1)}><ChevronLeft size={16} />Atrás</button>
            <button style={btnPrimary} onClick={handleSave} disabled={loading}>
              {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={16} />}
              {loading ? "Guardando..." : "Guardar historial"}
            </button>
          </div>
        </div>
        {error && <div style={{ padding: "0 24px 16px" }}><div style={{ padding: "10px 14px", background: "rgba(224,92,92,0.1)", border: "1px solid rgba(224,92,92,0.3)", borderRadius: 10, color: RED, fontSize: "0.85rem" }}>{error}</div></div>}
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .historical-row:hover td { background: rgba(255,255,255,0.025) !important; }
        `}</style>
      </div>
    </div>
  );

  // ── PASO 3: Confirmación ──────────────────────────────────────────────────
  return (
    <div style={card}>
      <div style={{ ...modal, maxWidth: 440 }}>
        {Header}
        <div style={{ padding: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(0,201,122,0.1)", border: "1px solid rgba(0,201,122,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={28} color={GREEN} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#fff" }}>¡Historial cargado!</p>
            <p style={{ margin: "8px 0 0", fontSize: "0.875rem", color: "rgba(255,255,255,0.4)" }}>
              {result?.snapshotsCreated} mes{result?.snapshotsCreated !== 1 ? "es" : ""} registrado{result?.snapshotsCreated !== 1 ? "s" : ""} exitosamente
            </p>
          </div>
          <div style={{ display: "flex", gap: 24, padding: "16px 24px", background: "rgba(189,142,72,0.06)", border: "1px solid rgba(189,142,72,0.2)", borderRadius: 12, width: "100%" }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Capital final</p>
              <p style={{ margin: "4px 0 0", fontSize: "1.3rem", fontWeight: 800, color: GOLD }}>${fmt(result?.capitalFinal ?? 0)}</p>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: "0.78rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>
            La gráfica de tendencia del usuario ahora mostrará su historial completo de rendimientos.
          </p>
          <button style={{ ...btnPrimary, width: "100%", justifyContent: "center" }} onClick={() => { onSuccess(); onClose(); }}>
            <Check size={16} /> Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
