import { getUsers } from "@/lib/actions/admin";

interface User {
  id: string;
  firstName: string;
  paternalSurname: string;
  email: string;
  role: string;
  baseCurrency?: string;
  totpEnabled: boolean;
  createdAt: Date;
}

export default async function UsersPage() {
  const { users } = (await getUsers()) as { users: User[] };

  return (
    <div>
      <header style={{ marginBottom: "30px" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: "bold", margin: 0 }}>
          Gestión de Usuarios
        </h1>
        <p style={{ color: "gray", marginTop: "5px" }}>
          Vista general de todos los usuarios registrados.
        </p>
      </header>

      <div
        style={{
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: "12px",
          padding: "1px",
          overflow: "hidden",
        }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", color: "#ddd" }}
        >
          <thead>
            <tr
              style={{
                textAlign: "left",
                backgroundColor: "rgba(255,255,255,0.05)",
              }}
            >
              <th style={{ padding: "16px", fontWeight: "600", fontSize: "0.9rem" }}>
                Usuario
              </th>
              <th style={{ padding: "16px", fontWeight: "600", fontSize: "0.9rem" }}>
                Email
              </th>
              <th style={{ padding: "16px", fontWeight: "600", fontSize: "0.9rem" }}>
                Rol
              </th>
              <th style={{ padding: "16px", fontWeight: "600", fontSize: "0.9rem" }}>
                Moneda
              </th>
              <th style={{ padding: "16px", fontWeight: "600", fontSize: "0.9rem" }}>
                Estado 2FA
              </th>
              <th style={{ padding: "16px", fontWeight: "600", fontSize: "0.9rem" }}>
                Fecha Registro
              </th>
            </tr>
          </thead>
          <tbody>
            {users?.map((user) => (
              <tr
                key={user.id}
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
              >
                <td style={{ padding: "16px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "50%",
                        background: "#333",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.8rem",
                      }}
                    >
                      {user.firstName?.[0] ?? "U"}
                    </div>
                    {user.firstName} {user.paternalSurname}
                  </div>
                </td>

                <td
                  style={{
                    padding: "16px",
                    fontFamily: "monospace",
                    color: "#aaa",
                  }}
                >
                  {user.email}
                </td>

                <td style={{ padding: "16px" }}>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: "20px",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      backgroundColor:
                        user.role === "SUPER_ADMIN"
                          ? "rgba(139, 92, 246, 0.2)"
                          : user.role === "ADMIN"
                          ? "rgba(59, 130, 246, 0.2)"
                          : "rgba(255,255,255,0.1)",
                      color:
                        user.role === "SUPER_ADMIN"
                          ? "#a78bfa"
                          : user.role === "ADMIN"
                          ? "#60a5fa"
                          : "#aaa",
                      border: `1px solid ${
                        user.role === "SUPER_ADMIN"
                          ? "rgba(139, 92, 246, 0.3)"
                          : user.role === "ADMIN"
                          ? "rgba(59, 130, 246, 0.3)"
                          : "rgba(255,255,255,0.1)"
                      }`,
                    }}
                  >
                    {user.role}
                  </span>
                </td>

                <td style={{ padding: "16px", fontWeight: "bold", color: "#ddd" }}>
                  {user.baseCurrency || "COP"}
                </td>

                <td style={{ padding: "16px" }}>
                  {user.totpEnabled ? (
                    <span style={{ color: "#4ade80", fontSize: "0.8rem" }}>
                      ● Activo
                    </span>
                  ) : (
                    <span style={{ color: "#ef4444", fontSize: "0.8rem" }}>
                      ● Inactivo
                    </span>
                  )}
                </td>

                <td
                  style={{ padding: "16px", fontSize: "0.9rem", color: "#888" }}
                >
                  {new Date(user.createdAt).toLocaleDateString("es-ES")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
