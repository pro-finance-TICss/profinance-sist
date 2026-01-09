"use client";
import React from 'react';
import { Wallet, BarChart3, PieChart } from 'lucide-react';

export function SummaryCards() {
    const metrics = [
        {
            label: "Ganancia lista para retirar",
            value: "$1,240.00",
            icon: <Wallet size={18} color="#00ff88" />, // Verde porque es dinero disponible
            trend: "Disponible"
        },
        {
            label: "Capital en Inversión",
            value: "$11,210.00",
            icon: <PieChart size={18} color="#bd8e48" />, // Dorado porque es el activo
            trend: "Activo"
        },
        {
            label: "Rendimiento Total",
            value: "+24.5%",
            icon: <BarChart3 size={18} color="#FFFFFF" />, // Blanco para el balance global
            trend: "Histórico"
        }
    ];

    return (
        <div style={{
            width: '100%',
            padding: '25px 0',
            backgroundColor: 'transparent',
            borderBottom: '1px solid rgba(189, 142, 72, 0.1)',
            borderTop: '1px solid rgba(189, 142, 72, 0.1)',
            marginBottom: '15px'
        }}>
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                gap: '20px',
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                {metrics.map((item, index) => (
                    <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '18px',
                        flex: '1 1 280px', // Esto asegura que sean responsivas y se estiren
                        padding: '10px'
                    }}>
                        {/* Icono discreto */}
                        <div style={{
                            minWidth: '45px',
                            height: '45px',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            {item.icon}
                        </div>

                        {/* Textos Informativos */}
                        <div>
                            <p style={{
                                color: 'rgba(255,255,255,0.5)',
                                fontSize: '0.85rem',
                                margin: '0 0 4px 0',
                                fontWeight: '400'
                            }}>
                                {item.label}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                                <span style={{
                                    color: '#FFFFFF',
                                    fontSize: '1.5rem',
                                    fontWeight: '700',
                                    letterSpacing: '-0.5px'
                                }}>
                                    {item.value}
                                </span>
                                <span style={{
                                    color: item.label.includes('retirar') ? '#00ff88' : 'rgba(189, 142, 72, 0.7)',
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    {item.trend}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}