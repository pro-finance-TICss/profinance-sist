"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import styles from "./dispositivos.module.css";
import { PageHeader } from "@/components/PageHeader";
import { logger } from "@/lib/logger";

interface Session {
  id: string;
  deviceName: string | null;
  ipAddress: string | null;
  lastActiveAt: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export default function DispositivosPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);


  // Cargar sesiones al montars
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/user/sessions");
      const data = await response.json();

      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (error) {
      logger.error("Error cargando sesiones:", error);
      setMessage({ type: "error", text: "Error al cargar sesiones" });
    } finally {
      setLoading(false);
    }
  };

  const revokeSession = async (sessionId: string, isCurrent: boolean) => {
    if (isCurrent) {
      if (!confirm("Esta es tu sesión actual. ¿Deseas cerrar sesión?")) {
        return;
      }
    }

    setActionLoading(sessionId);
    setMessage(null);

    try {
      const response = await fetch("/api/user/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.isCurrent) {
          // La sesión actual fue revocada en la DB.
          // Usamos signOut() para limpiar la cookie JWT ANTES de ir al login.
          // Si usáramos window.location.href, el JWT seguiría vigente y el
          // useSessionValidator detectaría la sesión revocada → bucle infinito.
          await signOut({ callbackUrl: "/login" });
          return;
        }
        setMessage({ type: "success", text: "Sesión cerrada correctamente" });
        loadSessions();
      } else {
        setMessage({
          type: "error",
          text: data.error || "Error al cerrar sesión",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error de conexión" });
    } finally {
      setActionLoading(null);
    }
  };

  const revokeAllSessions = async () => {
    if (
      !confirm(
        "¿Estás seguro de cerrar TODAS las sesiones? Serás redirigido al login."
      )
    ) {
      return;
    }

    setActionLoading("all");
    setMessage(null);

    try {
      const response = await fetch("/api/user/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revokeAll: true }),
      });

      const data = await response.json();

      if (data.success) {
        // Igual que al revocar la sesión actual: necesitamos signOut() para
        // limpiar la cookie JWT. window.location.href dejaría el token activo
        // y causaría un bucle de redirección en useSessionValidator.
        await signOut({ callbackUrl: "/login" });
      } else {
        setMessage({
          type: "error",
          text: data.error || "Error al cerrar sesiones",
        });
        setActionLoading(null);
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error de conexión" });
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Justo ahora";
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return `Hace ${diffDays} días`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          ← Volver
        </button>
        <h1 className={styles.title}>Sesiones Activas</h1>
      </div>

      {/* Mensaje de feedback */}
      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {/* Sección de Sesiones */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Dispositivos Conectados</h2>
          <p className={styles.sectionDescription}>
            Aquí puedes ver todas tus sesiones activas. Cierra las que no
            reconozcas para mantener tu cuenta segura.
          </p>
        </div>

        {loading ? (
          <div className={styles.loading}>Cargando sesiones...</div>
        ) : sessions.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No tienes sesiones activas.</p>
          </div>
        ) : (
          <>
            <div className={styles.deviceList}>
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`${styles.deviceCard} ${session.isCurrent ? styles.currentDevice : ""
                    }`}
                >
                  <div className={styles.deviceInfo}>
                    <span className={styles.deviceIcon}>
                      {session.isCurrent ? "🖥️" : "💻"}
                    </span>
                    <div>
                      <p className={styles.deviceName}>
                        {session.deviceName || "Dispositivo desconocido"}
                        {session.isCurrent && (
                          <span className={styles.currentBadge}>
                            Sesión actual
                          </span>
                        )}
                      </p>
                      <p className={styles.deviceMeta}>
                        Última actividad: {getTimeAgo(session.lastActiveAt)}
                      </p>
                      <p className={styles.deviceMeta}>
                        Expira: {formatDate(session.expiresAt)}
                      </p>
                      {session.ipAddress && (
                        <p className={styles.deviceMeta}>
                          IP: {session.ipAddress}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => revokeSession(session.id, session.isCurrent)}
                    disabled={actionLoading === session.id}
                    className={styles.revokeButton}
                  >
                    {actionLoading === session.id
                      ? "..."
                      : session.isCurrent
                        ? "Cerrar"
                        : "Cerrar sesión"}
                  </button>
                </div>
              ))}
            </div>

            {/* Botón para cerrar todas las sesiones */}
            {sessions.length > 1 && (
              <button
                onClick={revokeAllSessions}
                disabled={actionLoading === "all"}
                className={styles.revokeAllButton}
              >
                {actionLoading === "all"
                  ? "Cerrando sesiones..."
                  : "Cerrar todas las sesiones"}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
