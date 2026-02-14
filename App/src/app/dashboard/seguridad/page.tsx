"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./seguridad.module.css";
import { logger } from "@/lib/logger";

interface TrustedDevice {
  id: string;
  deviceName: string | null;
  lastUsedAt: string;
  createdAt: string;
  expiresAt: string;
}

export default function SeguridadPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Cargar dispositivos al montar
  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/user/sessions");
      const data = await response.json();

      if (data.success) {
        setDevices(data.devices);
      }
    } catch (error) {
      logger.error("Error cargando dispositivos:", error);
      setMessage({ type: "error", text: "Error al cargar dispositivos" });
    } finally {
      setLoading(false);
    }
  };

  const revokeDevice = async (deviceId: string) => {
    setActionLoading(deviceId);
    setMessage(null);

    try {
      const response = await fetch("/api/user/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: "success", text: "Sesión cerrada correctamente" });
        loadDevices();
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

  const revokeAllDevices = async () => {
    if (
      !confirm(
        "¿Estás seguro de cerrar sesión en todos los dispositivos? Tendrás que volver a verificar TOTP en cada uno."
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
        setMessage({
          type: "success",
          text: `${data.count} sesiones cerradas`,
        });
        loadDevices();
      } else {
        setMessage({
          type: "error",
          text: data.error || "Error al cerrar sesiones",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error de conexión" });
    } finally {
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
        <h1 className={styles.title}>Seguridad</h1>
      </div>

      {/* Mensaje de feedback */}
      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {/* Sección de Dispositivos de Confianza */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Dispositivos de Confianza</h2>
          <p className={styles.sectionDescription}>
            Estos dispositivos pueden iniciar sesión sin código TOTP por 30
            días.
          </p>
        </div>

        {loading ? (
          <div className={styles.loading}>Cargando dispositivos...</div>
        ) : devices.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No tienes dispositivos de confianza activos.</p>
            <p className={styles.emptyHint}>
              Marca "Confiar en este dispositivo" al iniciar sesión con TOTP
              para agregar uno.
            </p>
          </div>
        ) : (
          <>
            <div className={styles.deviceList}>
              {devices.map((device) => (
                <div key={device.id} className={styles.deviceCard}>
                  <div className={styles.deviceInfo}>
                    <span className={styles.deviceIcon}>🖥️</span>
                    <div>
                      <p className={styles.deviceName}>
                        {device.deviceName || "Dispositivo desconocido"}
                      </p>
                      <p className={styles.deviceMeta}>
                        Última actividad: {getTimeAgo(device.lastUsedAt)}
                      </p>
                      <p className={styles.deviceMeta}>
                        Expira: {formatDate(device.expiresAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => revokeDevice(device.id)}
                    disabled={actionLoading === device.id}
                    className={styles.revokeButton}
                  >
                    {actionLoading === device.id ? "..." : "Cerrar sesión"}
                  </button>
                </div>
              ))}
            </div>

            {/* Botón para cerrar todas las sesiones */}
            <button
              onClick={revokeAllDevices}
              disabled={actionLoading === "all"}
              className={styles.revokeAllButton}
            >
              {actionLoading === "all"
                ? "Cerrando sesiones..."
                : "Cerrar sesión en todos los dispositivos"}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
