"use client";
import React from "react";
import styles from "./Card.module.css";

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string; // Permitir clases adicionales
}

/**
 * @component Card
 * @description Componente contenedor con estilo de cristal (glassmorphism)
 * para el dashboard.
 */
export function Card({ children, title, className = "" }: CardProps) {
  return (
    <div className={`${styles.card} ${className}`}>
      {title && <h3 className={styles.cardTitle}>{title}</h3>}
      <div className={styles.cardContent}>{children}</div>
    </div>
  );
}
