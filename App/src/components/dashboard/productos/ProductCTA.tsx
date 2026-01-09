"use client";
import React from 'react';
import { Rocket, ArrowUpRight } from 'lucide-react';

export function ProductCTA() {
    return (
        <div style={{
            marginTop: '8px',
            padding: '32px',
            borderRadius: '24px',
            background: 'linear-gradient(90deg, rgba(189, 142, 72, 0.12) 0%, rgba(0,0,0,0.4) 100%)',
            border: '1px solid rgba(189, 142, 72, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '24px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Brillo decorativo de fondo */}
            <div style={{
                position: 'absolute',
                top: '-50%',
                left: '-10%',
                width: '300px',
                height: '300px',
                background: 'radial-gradient(circle, rgba(189, 142, 72, 0.08) 0%, transparent 70%)',
                zIndex: 0
            }} />

            <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '20px', alignItems: 'center' }}>
                <div style={{
                    backgroundColor: 'rgba(189, 142, 72, 0.15)',
                    padding: '12px',
                    borderRadius: '16px',
                    color: '#bd8e48'
                }}>
                    <Rocket size={28} />
                </div>
                <div>
                    <h3 style={{ color: '#fff', margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: '600' }}>
                        Potencia tu <span style={{ color: '#bd8e48' }}>Patrimonio</span>
                    </h3>
                    <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.9rem', maxWidth: '400px' }}>
                        Incrementa tu capital gestionado para reducir comisiones y desbloquear beneficios de Socio.
                    </p>
                </div>
            </div>

            <button
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(189, 142, 72, 0.4)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(189, 142, 72, 0.3)';
                }}
                style={{
                    position: 'relative',
                    zIndex: 1,
                    padding: '14px 28px',
                    backgroundColor: '#bd8e48',
                    color: '#000',
                    border: 'none',
                    borderRadius: '14px',
                    fontWeight: '700',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 15px rgba(189, 142, 72, 0.3)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
            >
                Ir
                <ArrowUpRight size={18} strokeWidth={2.5} />
            </button>
        </div>
    );
}