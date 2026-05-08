"use client";
import React from 'react';
import { Card } from '../ui/Card';
import {
    Wallet,
    Banknote,
    ArrowLeftRight,
    Gem,
    Users // Se añade Users para el nuevo botón
} from 'lucide-react';
import { useRouter } from 'next/navigation'; // Importación necesaria para navegación SPA

interface QuickActionsProps {
    onActionClick?: (title: string, type: string) => void;
    withdrawalWindow?: {
        isOpen: boolean;
        reason?: string;
    };
    isInvestment?: boolean;
}

export function QuickActions({ onActionClick, withdrawalWindow, isInvestment = false }: QuickActionsProps) {
    const router = useRouter(); // Hook para navegación fluida

    const actions = [
        {
            id: 'deposit',
            title: isInvestment ? 'Aportar de Ahorros' : 'Depositar',
            desc: isInvestment ? 'Aportar a Inversión' : 'Cargar capital',
            info: isInvestment ? 'Pasa fondos de ahorros para invertirlos.' : 'Inicia un fondeo seguro vía USDT o Transferencia Directa.',
            icon: <Wallet size={32} strokeWidth={1.2} />,
            disabled: false,
        },
        {
            id: 'withdraw',
            title: isInvestment ? 'Mover a Ahorros' : 'Retirar',
            desc: isInvestment ? 'A Ahorros' : 'Liquidar a banco',
            info: isInvestment ? 'Liquida fondos de tu Inversión hacia tu cuenta de ahorros.' : (withdrawalWindow?.isOpen
                ? 'Solicita la liquidación de tus rendimientos a tu cuenta preferida.'
                : (withdrawalWindow?.reason || 'Periodo cerrado')),
            icon: <Banknote size={32} strokeWidth={1.2} />,
            disabled: !isInvestment && !withdrawalWindow?.isOpen, // No hay disabled por periodo en la UI principal para Inversión xq igual manda a Cola
        },
        {
            id: 'transfer',
            title: 'Transferir',
            desc: 'Entre cuentas',
            info: 'Envía capital a otros usuarios de la red Profinance sin costo.',
            icon: <ArrowLeftRight size={32} strokeWidth={1.2} />,
            disabled: false,
        },
        {
            id: 'referrals', // ID actualizado
            title: 'Referidos', // Título actualizado
            desc: 'Red y comisiones', // Descripción actualizada
            info: 'Gestiona tu red de invitados y revisa tus comisiones acumuladas.', // Info actualizada
            icon: <Users size={32} strokeWidth={1.2} />, // Icono actualizado
            disabled: false,
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
                        font-size: 0.95rem;
                        color: #FFFFFF;
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
                        display: none;
                    }
                    .particles-quick {
                        position: absolute;
                        top: 0; left: 0; right: 0; bottom: 0;
                        background-image: url("https://www.transparenttextures.com/patterns/stardust.png");
                        opacity: 0.1;
                        pointer-events: none;
                        animation: floatStarsQuick 120s linear infinite;
                    }
                    
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
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '24px',
                    marginTop: '10px'
                }}>
                    {actions.map((action) => (
                        <div
                            key={action.id}
                            className="quick-action-item"
                            onClick={() => {
                                if (action.disabled) return;
                                // Redirección directa para Referidos, el resto sigue su flujo original
                                if (action.id === 'referrals') {
                                    router.push('/dashboard/referidos');
                                } else {
                                    onActionClick?.(action.title, action.id);
                                }
                            }}
                            style={{
                                opacity: action.disabled ? 0.5 : 1,
                                cursor: action.disabled ? 'not-allowed' : 'pointer',
                                pointerEvents: 'auto',
                            }}
                            title={action.disabled ? action.info : undefined}
                        >
                            <div className="particles-quick" />

                            <div style={{
                                width: '70px',
                                height: '70px',
                                borderRadius: '50%',
                                background: action.disabled
                                    ? 'radial-gradient(circle, rgba(150, 150, 150, 0.2) 0%, rgba(0,0,0,0) 70%)'
                                    : 'radial-gradient(circle, rgba(189, 142, 72, 0.2) 0%, rgba(0,0,0,0) 70%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '20px',
                                color: action.disabled ? '#888' : '#bd8e48',
                                border: action.disabled
                                    ? '1px solid rgba(150, 150, 150, 0.4)'
                                    : '1px solid rgba(189, 142, 72, 0.4)',
                                position: 'relative',
                                zIndex: 1
                            }}>
                                {action.icon}
                            </div>

                            <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
                                <h4 style={{
                                    color: action.disabled ? 'rgba(255, 255, 255, 0.4)' : '#FFFFFF',
                                    fontSize: '1.2rem',
                                    fontWeight: '700',
                                    marginBottom: '8px',
                                    margin: 0,
                                    letterSpacing: '0.5px'
                                }}>
                                    {action.title}
                                </h4>

                                <p className="base-desc" style={{
                                    color: action.disabled ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.5)',
                                    fontSize: '0.9rem',
                                    margin: 0
                                }}>
                                    {action.disabled ? (action.info.length > 30 ? 'Periodo cerrado' : action.info) : action.desc}
                                </p>

                                {!action.disabled && (
                                    <p className="info-text">
                                        {action.info}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}