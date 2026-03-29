import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "2rem",
        textAlign: "center",
        position: "relative",
        zIndex: 10,
      }}
    >
      <h1
        style={{
          fontFamily: "var(--font-primary)",
          fontSize: "5rem",
          background:
            "linear-gradient(90deg, rgba(189,142,72,1) 0%, rgba(248,223,143,1) 40%, rgba(189,142,72,1) 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          marginBottom: "0.5rem",
        }}
      >
        404
      </h1>
      <p
        style={{
          color: "rgba(255, 255, 255, 0.7)",
          fontSize: "1.1rem",
          marginBottom: "2rem",
          fontFamily: "var(--font-secondary)",
        }}
      >
        La página que buscas no existe o fue movida.
      </p>
      <Link
        href="/login"
        style={{
          display: "inline-block",
          padding: "0.8rem 2rem",
          background:
            "linear-gradient(90deg, rgba(189,142,72,1) 0%, rgba(248,223,143,1) 40%, rgba(189,142,72,1) 100%)",
          color: "#000",
          fontFamily: "var(--font-primary)",
          fontSize: "1rem",
          letterSpacing: "1px",
          textDecoration: "none",
          borderRadius: "8px",
          transition: "all 0.3s ease",
        }}
      >
        Volver al inicio
      </Link>
    </div>
  );
}
