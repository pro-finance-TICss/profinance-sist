"use client";
import React from 'react';
import { EducationVideo } from './EducationVideo';
import { LoyaltyRoadmap } from './LoyaltyRoadmap';
import { ProductCTA } from './ProductCTA'; // <-- Importación nueva

export function ProductsView() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ marginBottom: '10px' }}>
                <h2 style={{ color: '#fff', fontSize: '1.6rem', margin: '0 0 8px 0' }}>Portafolio y Crecimiento</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>Visualiza tus beneficios y expande tus conocimientos.</p>
            </div>

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