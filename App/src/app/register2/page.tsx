"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { registerSchema } from "@/lib/validations/auth";
import type { RegisterFormData } from "@/lib/validations/auth";
import { registerUser } from "@/lib/actions/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

import styles from "./register2.module.css";

// ============================================================================
// COMPONENTE PRINCIPAL DE REGISTRO
// ============================================================================
export default function Register2Page() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      paternalSurname: "",
      maternalSurname: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    setSuccessMessage(null);

    try {
      const result = await registerUser(data);

      if (!result.success) {
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, messages]) => {
            setError(field as keyof RegisterFormData, {
              type: "server",
              message: messages[0],
            });
          });
        }
        setServerError(result.message);
        return;
      }

      setSuccessMessage(result.message);
      setTimeout(() => {
        router.push("/login2");
      }, 2000);
    } catch (error) {
      console.error("Error en registro:", error);
      setServerError("Error de conexión.");
    }
  };

  return (
    <div className={styles.container}>
      {/* BRANDING SECTION */}
      <div className={styles.brandingSection}>
        <div className={styles.brandingContent}>
          <h1 className={styles.brandingTitle}>PRO-FINANCE</h1>
          <img
            src="/Background-recortado.png"
            alt="ProFinance Logo"
            className={styles.logo}
            style={{ borderRadius: "20%" }}
          />
          <p className={styles.brandingTagline}>
            Empoderando tu futuro financiero
          </p>
        </div>
      </div>

      {/* FORM SECTION */}
      <div className={styles.formSection}>
        <div className={styles.formContainer} style={{ maxWidth: "550px" }}>
          <div className={styles.formHeader}>
            <div className={styles.topSwitch}>
              <Link href="/login2" className={styles.switchBtn}>
                Iniciar Sesión
              </Link>
              <a
                href="#"
                className={`${styles.switchBtn} ${styles.switchBtnActive}`}
              >
                Registrarse
              </a>
            </div>
            <h2 className={styles.title}>Registrarse</h2>
          </div>

          {successMessage && (
            <div
              style={{
                background: "rgba(40, 167, 69, 0.2)",
                border: "1px solid #28a745",
                color: "#28a745",
                padding: "1rem",
                borderRadius: "8px",
                marginBottom: "1rem",
                textAlign: "center",
              }}
            >
              {successMessage}
            </div>
          )}

          {serverError && !successMessage && (
            <div className={styles.errorAlert}>{serverError}</div>
          )}

          {!successMessage && (
            <form
              className={styles.customForm}
              onSubmit={handleSubmit(onSubmit)}
            >
              <div className={styles.inputWrapper}>
                <Input
                  label="Nombre(s)"
                  type="text"
                  placeholder="Tu nombre"
                  {...register("firstName")}
                  error={errors.firstName?.message}
                />
              </div>

              <div style={{ display: "flex", gap: "1rem" }}>
                <div className={styles.inputWrapper} style={{ flex: 1 }}>
                  <Input
                    label="Apellido Paterno"
                    type="text"
                    placeholder="Paterno"
                    {...register("paternalSurname")}
                    error={errors.paternalSurname?.message}
                  />
                </div>
                <div className={styles.inputWrapper} style={{ flex: 1 }}>
                  <Input
                    label="Apellido Materno"
                    type="text"
                    placeholder="Materno"
                    {...register("maternalSurname")}
                    error={errors.maternalSurname?.message}
                  />
                </div>
              </div>

              <div className={styles.inputWrapper}>
                <Input
                  label="Correo Electrónico"
                  type="email"
                  placeholder="tu@email.com"
                  {...register("email")}
                  error={errors.email?.message}
                />
              </div>

              <div className={styles.inputWrapper}>
                <Input
                  label="Contraseña"
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                  error={errors.password?.message}
                />
              </div>

              <div className={styles.inputWrapper}>
                <Input
                  label="Confirmar Contraseña"
                  type="password"
                  placeholder="••••••••"
                  {...register("confirmPassword")}
                  error={errors.confirmPassword?.message}
                />
              </div>

              <div
                style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}
              >
                La contraseña debe tener 8+ caracteres, mayúscula, número y
                símbolo.
              </div>

              <div style={{ marginTop: "1rem" }}>
                <label
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "flex-start",
                    fontSize: "0.9rem",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  <input
                    type="checkbox"
                    style={{
                      marginTop: "0.2rem",
                      accentColor: "var(--color-gold-start)",
                    }}
                  />
                  <span>
                    Acepto los{" "}
                    <a href="#" className={styles.link}>
                      términos y condiciones
                    </a>{" "}
                    de servicio.
                  </span>
                </label>
              </div>

              <Button
                type="submit"
                className={styles.submitBtn}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Registrando..." : "Registrarse"}
              </Button>
            </form>
          )}

          <div
            style={{
              marginTop: "2rem",
              textAlign: "center",
              color: "rgba(255,255,255,0.5)",
              fontSize: "0.9rem",
            }}
          >
            ¿Ya eres miembro?{" "}
            <Link href="/login2" className={styles.link}>
              Inicia Sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
