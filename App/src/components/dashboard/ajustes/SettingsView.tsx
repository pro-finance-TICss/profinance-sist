"use client";
import React from 'react';
import { ProfileSettings } from './ProfileSettings';
import { SecuritySettings } from './SecuritySettings';

export function SettingsView() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
                <h2 style={{ color: '#fff', fontSize: '1.6rem', margin: '0 0 8px 0' }}>Configuración</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>Gestiona tu información personal y seguridad de la cuenta.</p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: '24px'
            }}>
                <ProfileSettings />
                <SecuritySettings />
            </div>
        </div>
    );
}