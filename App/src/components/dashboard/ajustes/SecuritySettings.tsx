"use client";
import React from 'react';
import { Lock, Smartphone } from 'lucide-react';

export function SecuritySettings() {
    return (
        <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '24px',
            padding: '24px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
            <h3 style={{ color: '#fff', marginBottom: '20px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Lock size={20} color="#bd8e48" /> Seguridad
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button style={{
                    padding: '16px',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    color: '#fff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer'
                }}>
                    <span style={{ fontSize: '0.9rem' }}>Cambiar Contraseña</span>
                    <ChevronRight size={16} color="rgba(255,255,255,0.3)" />
                </button>

                <div style={{
                    padding: '16px',
                    backgroundColor: 'rgba(189, 142, 72, 0.05)',
                    border: '1px solid rgba(189, 142, 72, 0.1)',
                    borderRadius: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <Smartphone size={20} color="#bd8e48" />
                        <div>
                            <div style={{ color: '#fff', fontSize: '0.9rem' }}>Autenticación 2FA</div>
                            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>Añade una capa extra de seguridad</div>
                        </div>
                    </div>
                    <div style={{ width: '40px', height: '20px', backgroundColor: '#bd8e48', borderRadius: '20px', position: 'relative' }}>
                        <div style={{ width: '16px', height: '16px', backgroundColor: '#fff', borderRadius: '50%', position: 'absolute', right: '2px', top: '2px' }} />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Pequeño fix para el icono Chevron que falta
const ChevronRight = ({ size, color }: { size: number, color: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
);