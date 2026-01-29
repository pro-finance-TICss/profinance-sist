"use client";
import React from 'react';
import { ProfileSettings } from './ProfileSettings';
import { SecuritySettings } from './SecuritySettings';
import { PageHeader } from "@/components/PageHeader";

export function SettingsView() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            <h1>TEST</h1>

            {/* 🟢 REEMPLAZO: Diseño estandarizado para Ajustes */}
            <PageHeader
                title="Configuración"
                subtitle="Gestiona tu información personal y la seguridad de tu cuenta en un solo lugar."
            />

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