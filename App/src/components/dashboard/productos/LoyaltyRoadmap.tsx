"use client";
import React from 'react';
import { ShieldCheck, Star, Award, TrendingUp, ChevronRight } from 'lucide-react';

export function LoyaltyRoadmap() {
    const levels = [
        {
            time: '3 Meses',
            label: 'Inversor Bronce',
            benefit: 'Retiros sin comisión',
            icon: <Star size={18} />,
            color: '#CD7F32' // Color bronce
        },
        {
            time: '6 Meses',
            label: 'Socio Plata',
            benefit: 'Acceso a fondos VIP',
            icon: <Award size={18} />,
            color: '#C0C0C0' // Color plata
        },
        {
            time: '12 Meses',
            label: 'Socio Oro',
            benefit: 'Capital 100% Protegido',
            icon: <ShieldCheck size={18} />,
            color: '#bd8e48' // Tu dorado corporativo
        },
    ];

    return (
        <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '24px',
            padding: '24px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <TrendingUp size={20} color="#bd8e48" />
                    <h3 style={{ color: '#fff', margin: 0, fontSize: '1.1rem' }}>Programa de Lealtad</h3>
                </div>
                <span style={{
                    fontSize: '0.7rem',
                    color: '#bd8e48',
                    backgroundColor: 'rgba(189, 142, 72, 0.1)',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    border: '1px solid rgba(189, 142, 72, 0.2)'
                }}>
                    BENEFICIOS ACTIVOS
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                {levels.map((lvl, i) => (
                    <div
                        key={i}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateX(8px)';
                            e.currentTarget.style.backgroundColor = 'rgba(189, 142, 72, 0.08)';
                            e.currentTarget.style.borderColor = 'rgba(189, 142, 72, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateX(0)';
                            e.currentTarget.style.backgroundColor = 'rgba(189, 142, 72, 0.03)';
                            e.currentTarget.style.borderColor = 'rgba(189, 142, 72, 0.1)';
                        }}
                        style={{
                            padding: '16px',
                            backgroundColor: 'rgba(189, 142, 72, 0.03)',
                            borderRadius: '16px',
                            border: '1px solid rgba(189, 142, 72, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            cursor: 'pointer'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                                color: lvl.color,
                                backgroundColor: 'rgba(0,0,0,0.3)',
                                padding: '10px',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: `1px solid ${lvl.color}33` // Color con opacidad
                            }}>
                                {lvl.icon}
                            </div>
                            <div>
                                <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: '600' }}>{lvl.label}</div>
                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginTop: '2px' }}>{lvl.benefit}</div>
                            </div>
                        </div>

                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                color: '#bd8e48',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                letterSpacing: '0.5px'
                            }}>
                                {lvl.time}
                            </span>
                            <ChevronRight size={14} color="rgba(189, 142, 72, 0.4)" />
                        </div>
                    </div>
                ))}
            </div>

            <p style={{
                color: 'rgba(255,255,255,0.3)',
                fontSize: '0.75rem',
                marginTop: '20px',
                textAlign: 'center',
                fontStyle: 'italic'
            }}>
                *Los beneficios se activan automáticamente al cumplir el tiempo de permanencia.
            </p>
        </div>
    );
}