"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        padding: "40px",
        color: "white",
        textAlign: "center",
      }}
    >
      <h2>Algo salió mal en Super Admin</h2>
      <p style={{ color: "red", marginBottom: "20px" }}>{error.message}</p>
      <button
        onClick={() => reset()}
        style={{
          padding: "10px 20px",
          backgroundColor: "#bd8e48",
          color: "black",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Intentar de nuevo
      </button>
    </div>
  );
}
