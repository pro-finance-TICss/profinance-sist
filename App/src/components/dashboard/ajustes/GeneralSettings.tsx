"use client";
import React from 'react';
import { User, Bell, Globe, Moon } from 'lucide-react';

export function GeneralSettings() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '24px',
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
            }}>
                <h3 style={{ color: '#fff', marginBottom: '20px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <User size={20} color="#bd8e48" /> Preferencias de Cuenta
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Globe size={18} color="rgba(255,255,255,0.4)" />
                            <span style={{ color: '#fff', fontSize: '0.9rem' }}>Idioma</span>
                        </div>
                        <span style={{ color: '#bd8e48', fontSize: '0.9rem' }}>Español</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Bell size={18} color="rgba(255,255,255,0.4)" />
                            <span style={{ color: '#fff', fontSize: '0.9rem' }}>Notificaciones Push</span>
                        </div>
                        <span style={{ color: '#00ff88', fontSize: '0.8rem' }}>Activado</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Moon size={18} color="rgba(255,255,255,0.4)" />
                            <span style={{ color: '#fff', fontSize: '0.9rem' }}>Tema Visual</span>
                        </div>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Dark Gold (Pro)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}