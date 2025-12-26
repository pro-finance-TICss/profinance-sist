"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SystemHeader } from "@/components/SystemHeader";
import { Input } from "@/components/ui/Input";
import { loginSchema, type LoginFormData } from "@/lib/schemas";

/**
 * @page LoginPage
 * @description Página de inicio de sesión del sistema.
 * Implementa validación con Zod, manejo de estados y redirección segura.
 */
export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Estado del formulario
  const [formData, setFormData] = useState<LoginFormData>({
    username: "",
    password: "",
  });

  // Estado de errores de validación
  const [errors, setErrors] = useState<
    Partial<Record<keyof LoginFormData, string>>
  >({});

  // Manejador de cambios en inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    // Limpiar error al escribir
    if (errors[id as keyof LoginFormData]) {
      setErrors((prev) => ({ ...prev, [id]: undefined }));
    }
  };

  /**
   * Maneja el envío del formulario.
   * Valida los datos contra el esquema Zod antes de proceder.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    // 1. Validación con Zod
    const result = loginSchema.safeParse(formData);

    if (!result.success) {
      // Mapear errores de Zod a nuestro estado
      const fieldErrors: any = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0]] = issue.message;
      });
      setErrors(fieldErrors);
      setIsLoading(false);
      return;
    }

    // 2. Simulación de llamada a API
    try {
      // TODO: Reemplazar con llamada real a API (fetch / axios)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Éxito
      router.push("/verification");
    } catch (error) {
      console.error("Login error:", error);
      // Mostrar error general si falla
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-container">
      <SystemHeader />

      <div className="auth-card">
        <header className="auth-header"></header>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <Input
            label="Usuario"
            id="username"
            type="text"
            placeholder="Usuario"
            value={formData.username}
            onChange={handleChange}
            error={errors.username}
            autoComplete="username"
            required // Fallback HTML5
          />

          <Input
            label="Contraseña"
            id="password"
            type="password"
            placeholder="Contraseña"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            autoComplete="current-password"
            required
          />

          <div className="form-actions">
            <Link href="#" className="forgot-password">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading}>
            <span className="btn-text">
              {isLoading ? "CARGANDO..." : "INICIAR SESIÓN"}
            </span>
          </button>

          <div className="auth-footer">
            ¿No tienes cuenta?
            <Link href="/register">Registrarse</Link>
          </div>
        </form>
      </div>
    </main>
  );
}
