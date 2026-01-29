"use client";
import React from 'react';
import { EducationVideo } from './EducationVideo';
import { LoyaltyRoadmap } from './LoyaltyRoadmap';
import { ProductCTA } from './ProductCTA'; // <-- Importación nueva
import { PageHeader } from "@/components/PageHeader";

export function ProductsView() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* 🟢 REEMPLAZO: El PageHeader unifica el diseño */}
            <PageHeader
                title="Productos"
                subtitle="Visualiza tus beneficios y expande tus conocimientos con nuestro ecosistema."
            />

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '24px'
            }}>
                <EducationVideo />
                <LoyaltyRoadmap />
            </div>

            {/* ✅ El CTA ahora es una sola línea, súper limpio */}
            <ProductCTA />
        </div>
    );
}
