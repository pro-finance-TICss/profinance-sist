import React from "react";
import styles from "./Card.module.css";

/**
 * Props del componente Card.
 */
interface CardProps {
  /** Título opcional del card */
  title?: string;
  /** Contenido del card */
  children: React.ReactNode;
  /** Clases CSS adicionales */
  className?: string;
}

/**
 * @component Card
 * @description Contenedor glassmorphism reutilizable para secciones de contenido.
 * Proporciona un diseño consistente con efectos visuales del estilo Pro-Finance.
 *
 * @example
 * ```tsx
 * <Card title="Balance Actual">
 *   <p>$10,000.00</p>
 * </Card>
 * ```
 */
export function Card({ title, children, className = "" }: CardProps) {
  return (
    <article className={`${styles.card} ${className}`}>
      {title && <h3 className={styles.cardTitle}>{title}</h3>}
      <div className={styles.cardContent}>{children}</div>
    </article>
  );
}
