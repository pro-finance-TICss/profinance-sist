// ============================================================================
// PÁGINA DE REGISTRO - PRO-FINANCE
// ============================================================================
// Formulario de registro con React Hook Form, Zod y Server Actions.
// ============================================================================

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { registerSchema } from "@/lib/validations/auth";
import type { RegisterFormData } from "@/lib/validations/auth";
import { registerUser } from "@/lib/actions/auth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SystemHeader } from "@/components/SystemHeader";

import styles from "./page.module.css";

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

/**
 * Página de registro de usuarios.
 * Valida datos con Zod y los envía al servidor a través de Server Actions.
 */
export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ================================================================
  // FORMULARIO CON REACT HOOK FORM + ZOD
  // ================================================================
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

  // ================================================================
  // HANDLER DE ENVÍO
  // ================================================================

  /**
   * Maneja el envío del formulario de registro.
   * Envía los datos al servidor y procesa la respuesta.
   */
  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    setSuccessMessage(null);

    try {
      const result = await registerUser(data);

      if (!result.success) {
        // Manejar errores de campo específicos
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

      // Registro exitoso
      setSuccessMessage(result.message);

      // Redirigir a login después de 2 segundos
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error) {
      console.error("Error en registro:", error);
      setServerError("Error de conexión. Por favor intenta de nuevo.");
    }
  };

  // ================================================================
  // RENDER
  // ================================================================

  return (
    <>
      {/* Header del sistema */}
      <SystemHeader />

      {/* Fondo con logo */}
      <div className="background-container">
        <div className="bg-logo-placeholder" />
      </div>

      <main className="auth-container">
        <div className="auth-card">
          {/* Header del formulario */}
          <header className="auth-header">
            <p className={styles.subtitle}>Crea tu cuenta</p>
          </header>

          {/* Mensaje de éxito */}
          {successMessage && (
            <div className={styles.successAlert}>{successMessage}</div>
          )}

          {/* Error del servidor */}
          {serverError && !successMessage && (
            <div className={styles.errorAlert}>{serverError}</div>
          )}

          {/* Formulario de registro */}
          {!successMessage && (
            <form
              className="auth-form"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
            >
              {/* Nombre solo en una fila */}
              <Input
                label="Nombre"
                type="text"
                placeholder="Nombre(s)"
                autoComplete="given-name"
                {...register("firstName")}
                error={errors.firstName?.message}
              />

              {/* Los dos Apellidos en una misma fila */}
              <div className={styles.row}>
                <Input
                  label="Apellido Paterno"
                  type="text"
                  placeholder="Apellido Paterno"
                  autoComplete="family-name"
                  {...register("paternalSurname")}
                  error={errors.paternalSurname?.message}
                />

                <Input
                  label="Apellido Materno"
                  type="text"
                  placeholder="Apellido Materno"
                  autoComplete="family-name"
                  {...register("maternalSurname")}
                  error={errors.maternalSurname?.message}
                />
              </div>

              <Input
                label="Correo Electrónico"
                type="email"
                placeholder="tu@email.com"
                autoComplete="email"
                {...register("email")}
                error={errors.email?.message}
              />

              <Input
                label="Contraseña"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                {...register("password")}
                error={errors.password?.message}
              />

              <Input
                label="Confirmar Contraseña"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                {...register("confirmPassword")}
                error={errors.confirmPassword?.message}
              />

              {/* Requisitos de contraseña */}
              <p className={styles.passwordHint}>
                La contraseña debe tener mínimo 8 caracteres, incluyendo
                mayúscula, número y carácter especial.
              </p>

              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? "CREANDO CUENTA..." : "CREAR CUENTA"}
              </Button>

              <div className="auth-footer">
                ¿Ya tienes cuenta?
                <Link href="/login">Iniciar Sesión</Link>
              </div>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
