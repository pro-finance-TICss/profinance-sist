"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { contactSchema } from "@/lib/schemas";
import type { ContactFormData } from "@/lib/schemas";
import { z } from "zod";
import styles from "./page.module.css";

/**
 * Tipo para items del FAQ.
 */
interface FAQItem {
  question: string;
  answer: string;
}

/**
 * Preguntas frecuentes (FAQ).
 */
const faqItems: FAQItem[] = [
  {
    question: "¿Cómo puedo depositar fondos en mi cuenta?",
    answer:
      "Puedes depositar fondos desde la sección 'Fondos' mediante tarjeta, transferencia bancaria o efectivo. Los depósitos son procesados inmediatamente.",
  },
  {
    question: "¿Cuánto tiempo tarda un retiro?",
    answer:
      "Los retiros se procesan en un plazo de 1-3 días hábiles dependiendo del método seleccionado. Las transferencias bancarias suelen ser más rápidas.",
  },
  {
    question: "¿Hay límites para depósitos y retiros?",
    answer:
      "El monto mínimo para depósitos y retiros es de $10. El monto máximo de depósito es de $1,000,000. Los retiros no pueden exceder tu balance disponible.",
  },
  {
    question: "¿Mi información está segura?",
    answer:
      "Sí, utilizamos encriptación de nivel bancario y seguimos las mejores prácticas de seguridad para proteger tu información personal y financiera.",
  },
  {
    question: "¿Cómo puedo contactar al soporte?",
    answer:
      "Puedes contactarnos mediante el formulario en esta página o escribirnos directamente a soporte@pro-finance.com. Te responderemos en menos de 24 horas.",
  },
];

/**
 * @page ContactanosPage
 * @route /dashboard/contactanos
 * @description Página de contacto y soporte con FAQ expandible y formulario de contacto.
 */
export default function ContactanosPage() {
  // Estado para el accordion del FAQ
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  // Estados del formulario
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  /**
   * Maneja el toggle del FAQ accordion.
   */
  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  /**
   * Maneja los cambios en los inputs del formulario.
   */
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Maneja el envío del formulario de contacto.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage("");
    setIsLoading(true);

    try {
      // Validar con Zod
      const data: ContactFormData = contactSchema.parse(formData);

      // Simular llamada a API
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setSuccessMessage(
        "¡Mensaje enviado con éxito! Nuestro equipo se pondrá en contacto contigo pronto."
      );

      // Resetear formulario
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Contáctanos">
      <div className={styles.container}>
        {/* Success Message Global */}
        {successMessage && (
          <div className={styles.successMessage}>{successMessage}</div>
        )}

        {/* Two Column Layout: FAQ + Contact Form */}
        <div className={styles.twoColumnLayout}>
          {/* FAQ Section - Left Column */}
          <section className={styles.faqSection}>
            <h2 className={styles.sectionTitle}>Preguntas Frecuentes</h2>

            <div className={styles.faqList}>
              {faqItems.map((item, index) => (
                <div key={index} className={styles.faqItem}>
                  <button
                    className={styles.faqQuestion}
                    onClick={() => toggleFAQ(index)}
                    aria-expanded={openFAQ === index}
                  >
                    <span>{item.question}</span>
                    <span className={styles.faqIcon}>
                      {openFAQ === index ? "−" : "+"}
                    </span>
                  </button>

                  {openFAQ === index && (
                    <div className={styles.faqAnswer}>{item.answer}</div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Contact Form Section - Right Column */}
          <section className={styles.contactSection}>
            <Card title="Envíanos un Mensaje">
              <form onSubmit={handleSubmit} className={styles.form}>
                <Input
                  label="Nombre Completo"
                  type="text"
                  name="name"
                  placeholder="Tu nombre"
                  value={formData.name}
                  onChange={handleInputChange}
                  error={errors.name}
                />

                <Input
                  label="Correo Electrónico"
                  type="email"
                  name="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  error={errors.email}
                />

                <Input
                  label="Asunto (opcional)"
                  type="text"
                  name="subject"
                  placeholder="Motivo del contacto"
                  value={formData.subject}
                  onChange={handleInputChange}
                  error={errors.subject}
                />

                <div className={styles.inputGroup}>
                  <label htmlFor="message" className={styles.label}>
                    Mensaje
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    className={styles.textarea}
                    rows={10}
                    placeholder="Escribe tu consulta aquí..."
                    value={formData.message}
                    onChange={handleInputChange}
                  />
                  {errors.message && (
                    <span className={styles.errorText}>{errors.message}</span>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={
                    isLoading ||
                    !formData.name ||
                    !formData.email ||
                    !formData.message
                  }
                >
                  {isLoading ? "Enviando..." : "Enviar Mensaje"}
                </Button>
              </form>
            </Card>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
