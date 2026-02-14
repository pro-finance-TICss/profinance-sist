"use client";
import React from "react";
import { useDashboard } from "@/contexts/DashboardContext";

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    action?: {
        label: string;
        onClick: () => void;
        icon?: React.ReactNode;
        variant?: "primary" | "secondary";
    };
}

/**
 * PageHeader Component
 * 
 * Componente reutilizable para encabezados de página en el dashboard del Socio/Usuario.
 * Proporciona un diseño consistente con soporte para títulos, subtítulos y acciones.
 * 
 * @param title - Título principal de la página
 * @param subtitle - Subtítulo opcional descriptivo
 * @param action - Botón de acción opcional con label, onClick, icon y variant
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    action,
}) => {
    const { isMobile, isTablet } = useDashboard();

    return (
        <div
            style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                justifyContent: "space-between",
                alignItems: isMobile ? "flex-start" : "center",
                gap: isMobile ? "15px" : "20px",
                marginBottom: isMobile ? "20px" : "30px",
                padding: isMobile ? "15px" : "0",
            }}
        >
            {/* Título y Subtítulo */}
            <div style={{ flex: 1 }}>
                <h1
                    style={{
                        margin: 0,
                        fontSize: isMobile ? "1.5rem" : isTablet ? "1.75rem" : "2rem",
                        fontWeight: "700",
                        color: "#fff",
                        letterSpacing: "-0.5px",
                        lineHeight: "1.2",
                    }}
                >
                    {title}
                </h1>
                {subtitle && (
                    <p
                        style={{
                            margin: "8px 0 0 0",
                            fontSize: isMobile ? "0.85rem" : "0.9rem",
                            color: "rgba(255, 255, 255, 0.6)",
                            lineHeight: "1.4",
                        }}
                    >
                        {subtitle}
                    </p>
                )}
            </div>

            {/* Botón de Acción */}
            {action && (
                <button
                    onClick={action.onClick}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: isMobile ? "12px 20px" : "14px 24px",
                        backgroundColor:
                            action.variant === "secondary"
                                ? "rgba(255, 255, 255, 0.05)"
                                : "#bd8e48",
                        color: action.variant === "secondary" ? "#bd8e48" : "#000",
                        border:
                            action.variant === "secondary"
                                ? "1px solid rgba(189, 142, 72, 0.3)"
                                : "none",
                        borderRadius: "12px",
                        fontSize: isMobile ? "0.85rem" : "0.9rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        boxShadow:
                            action.variant === "secondary"
                                ? "none"
                                : "0 4px 12px rgba(189, 142, 72, 0.3)",
                        whiteSpace: "nowrap",
                        width: isMobile ? "100%" : "auto",
                        justifyContent: "center",
                    }}
                    onMouseEnter={(e) => {
                        if (action.variant === "secondary") {
                            e.currentTarget.style.backgroundColor = "rgba(189, 142, 72, 0.1)";
                            e.currentTarget.style.borderColor = "#bd8e48";
                        } else {
                            e.currentTarget.style.backgroundColor = "#a67a3d";
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow =
                                "0 6px 16px rgba(189, 142, 72, 0.4)";
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (action.variant === "secondary") {
                            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
                            e.currentTarget.style.borderColor = "rgba(189, 142, 72, 0.3)";
                        } else {
                            e.currentTarget.style.backgroundColor = "#bd8e48";
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow =
                                "0 4px 12px rgba(189, 142, 72, 0.3)";
                        }
                    }}
                >
                    {action.icon && <span style={{ display: "flex" }}>{action.icon}</span>}
                    <span>{action.label}</span>
                </button>
            )}
        </div>
    );
};
