"use client";

import React, { useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { BalanceSection } from "../../components/dashboard/BalanceSection";
import { ActivitySection } from "../../components/dashboard/ActivitySection";
import { QuickActions } from "../../components/dashboard/QuickActions";
import { SummaryCards } from "../../components/dashboard/SummaryCards";
import { ActionModal } from "../../components/dashboard/ActionModal";
import { DepositForm } from "../../components/dashboard/DepositForm";

export default function DashboardPage() {
  const { isMobile } = useDashboard();

  // --- ESTADOS PARA EL MODAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({ title: "", type: "" });

  const handleOpenModal = (title: string, type: string) => {
    setModalConfig({ title, type });
    setIsModalOpen(true);
  };
  // ---------------------------------------

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "24px",
        }}
      >
        <div style={{ gridColumn: isMobile ? "span 12" : "span 8" }}>
          <BalanceSection />
        </div>
        <div style={{ gridColumn: isMobile ? "span 12" : "span 4" }}>
          <ActivitySection />
        </div>

        <div style={{ gridColumn: "span 12" }}>
          <SummaryCards />
        </div>

        <div style={{ gridColumn: "span 12" }}>
          <QuickActions onActionClick={handleOpenModal} />
        </div>
      </div>

      {/* --- COMPONENTE MODAL --- */}
      <ActionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalConfig.title}
      >
        {modalConfig.type === "deposit" ? (
          <DepositForm />
        ) : (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <p>Formulario de {modalConfig.title} en Proceso...</p>
          </div>
        )}
      </ActionModal>
    </>
  );
}
