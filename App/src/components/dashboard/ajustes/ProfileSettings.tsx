"use client";
import React, { useEffect, useState } from "react";
import { User, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { getUserProfile } from "@/lib/actions/user-settings";
import { logger } from "@/lib/logger";

interface UserProfile {
  firstName: string;
  paternalSurname: string;
  maternalSurname: string;
  email: string;
}

export function ProfileSettings() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const result = await getUserProfile();
        if (result.success && result.user) {
          setProfile(result.user);
        }
      } catch (error) {
        logger.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  return (
    <div
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        borderRadius: "24px",
        padding: "24px",
        border: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      <h3
        style={{
          color: "#fff",
          marginBottom: "20px",
          fontSize: "1.1rem",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <User size={20} color="#bd8e48" /> Información del Perfil
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {loading ? (
          <div style={{ color: "rgba(255,255,255,0.4)" }}>
            Cargando datos...
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gap: "16px",
                gridTemplateColumns: "1fr 1fr",
              }}
            >
              <div style={{ gridColumn: "span 2" }}>
                <Input
                  label="Nombre(s)"
                  value={profile?.firstName || ""}
                  readOnly
                  disabled
                  style={{ opacity: 0.7, cursor: "not-allowed" }}
                />
              </div>
              <Input
                label="Apellido Paterno"
                value={profile?.paternalSurname || ""}
                readOnly
                disabled
                style={{ opacity: 0.7, cursor: "not-allowed" }}
              />
              <Input
                label="Apellido Materno"
                value={profile?.maternalSurname || ""}
                readOnly
                disabled
                style={{ opacity: 0.7, cursor: "not-allowed" }}
              />
            </div>

            <div style={{ marginTop: "8px" }}>
              <Input
                label="Correo Electrónico"
                value={profile?.email || ""}
                readOnly
                disabled
                style={{ opacity: 0.7, cursor: "not-allowed" }}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "12px",
                alignItems: "center",
                borderTop: "1px solid rgba(255,255,255,0.05)",
                marginTop: "8px",
              }}
            >
              <span
                style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}
              >
                Estado de Cuenta
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#00ff88",
                  fontSize: "0.8rem",
                  backgroundColor: "rgba(0,255,136,0.1)",
                  padding: "4px 12px",
                  borderRadius: "20px",
                }}
              >
                <ShieldCheck size={14} /> Verificada
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
