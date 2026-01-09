"use client";
import React from 'react';
import { User, Mail, ShieldCheck } from 'lucide-react';

export function ProfileSettings() {
    return (
        <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '24px',
            padding: '24px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
            <h3 style={{ color: '#fff', marginBottom: '20px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User size={20} color="#bd8e48" /> Información del Perfil
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Nombre Completo</span>
                    <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: '500' }}>Juan David</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Correo Electrónico</span>
                    <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: '500' }}>usuario@profinance.com</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', alignItems: 'center' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Estado de Cuenta</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00ff88', fontSize: '0.8rem', backgroundColor: 'rgba(0,255,136,0.1)', padding: '4px 12px', borderRadius: '20px' }}>
                        <ShieldCheck size={14} /> Verificada
                    </div>
                </div>
            </div>
        </div>
    );
}