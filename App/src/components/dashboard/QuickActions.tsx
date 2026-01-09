"use client";
import React from 'react';
import { Card } from '../ui/Card';
import {
    Wallet,
    Banknote,
    ArrowLeftRight,
    Gem
} from 'lucide-react';

interface QuickActionsProps {
    onActionClick?: (title: string, type: string) => void;
}

export function QuickActions({ onActionClick }: QuickActionsProps) {
    const actions = [
        {
            id: 'deposit',
            title: 'Depositar',
            desc: 'Cargar capital',
            info: 'Inicia un fondeo seguro vía USDT o Transferencia Directa.',
            icon: <Wallet size={32} strokeWidth={1.2} />
        },
        {
            id: 'withdraw',
            title: 'Retirar',
            desc: 'Liquidar a banco',
            info: 'Solicita la liquidación de tus rendimientos a tu cuenta preferida.',
            icon: <Banknote size={32} strokeWidth={1.2} />
        },
        {
            id: 'transfer',
            title: 'Transferir',
            desc: 'Entre cuentas',
            info: 'Envía capital a otros usuarios de la red Profinance sin costo.',
            icon: <ArrowLeftRight size={32} strokeWidth={1.2} />
        },
        {
            id: 'invest',
            title: 'Nueva Inversión',
            desc: 'Activos de lujo',
            info: 'Explora nuevos portafolios y diversifica tu capital hoy mismo.',
            icon: <Gem size={32} strokeWidth={1.2} />
        },
    ];

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <style>
                {`
                    @keyframes floatStarsQuick {
                        0% { background-position: 0% 0%; }
                        100% { background-position: 100% 100%; }
                    }
                    .quick-action-item {
                        padding: 40px 25px;
                        border-radius: 24px;
                        background-color: rgba(255, 255, 255, 0.02);
                        border: 1px solid rgba(189, 142, 72, 0.15);
                        cursor: pointer;
                        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                        text-align: center;
                        position: relative;
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 220px;
                    }
                    .quick-action-item:hover {
                        background-color: rgba(189, 142, 72, 0.06);
                        border-color: rgba(189, 142, 72, 0.8);
                        transform: translateY(-10px);
                        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
                    }
                    .info-text {
                        max-height: 0;
                        opacity: 0;
                        transition: all 0.4s ease;
                        font-size: 0.95rem; /* Letra más grande */
                        color: #FFFFFF;    /* Blanco Puro */
                        margin-top: 0;
                        line-height: 1.5;
                        font-weight: 300;
                    }
                    .quick-action-item:hover .info-text {
                        max-height: 100px;
                        opacity: 1;
                        margin-top: 15px;
                    }
                    .quick-action-item:hover .base-desc {
                        display: none; /* Ocultamos el desc corto al hacer hover para dar espacio */
                    }
                    .particles-quick {
                        position: absolute;
                        top: 0; left: 0; right: 0; bottom: 0;
                        background-image: url("https://www.transparenttextures.com/patterns/stardust.png");
                        opacity: 0.1;
                        pointer-events: none;
                        animation: floatStarsQuick 120s linear infinite;
                    }
                    
                    /* Media Query para asegurar Responsividad en móviles pequeños */
                    @media (max-width: 640px) {
                        .quick-action-item {
                            min-height: 200px;
                            padding: 30px 15px;
                        }
                    }
                `}
            </style>

            <Card title="Acciones Rápidas">
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', /* Columnas más anchas para mejor lectura */
                    gap: '24px',
                    marginTop: '10px'
                }}>
                    {actions.map((action) => (
                        <div
                            key={action.id}
                            className="quick-action-item"
                            onClick={() => onActionClick?.(action.title, action.id)}
                        >
                            <div className="particles-quick" />

                            <div style={{
                                width: '70px',
                                height: '70px',
                                borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(189, 142, 72, 0.2) 0%, rgba(0,0,0,0) 70%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '20px',
                                color: '#bd8e48',
                                border: '1px solid rgba(189, 142, 72, 0.4)',
                                position: 'relative',
                                zIndex: 1
                            }}>
                                {action.icon}
                            </div>

                            <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
                                <h4 style={{
                                    color: '#FFFFFF',
                                    fontSize: '1.2rem',
                                    fontWeight: '700',
                                    marginBottom: '8px',
                                    margin: 0,
                                    letterSpacing: '0.5px'
                                }}>
                                    {action.title}
                                </h4>

                                <p className="base-desc" style={{
                                    color: 'rgba(255, 255, 255, 0.5)',
                                    fontSize: '0.9rem',
                                    margin: 0
                                }}>
                                    {action.desc}
                                </p>

                                <p className="info-text">
                                    {action.info}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}