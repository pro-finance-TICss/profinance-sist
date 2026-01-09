"use client";
import React from 'react';
import { Search, Bell, User } from 'lucide-react';

export const DashboardHeader = ({ title }: { title: string }) => {
    return (
        <header style={{
            height: '80px',
            padding: '0 30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(0, 0, 0, 0.8)', // Fondo oscuro con transparencia
            backdropFilter: 'blur(10px)', // Efecto cristal
            borderBottom: '1px solid rgba(189, 142, 72, 0.2)',
            position: 'sticky',
            top: 0,
            zIndex: 50,
            width: '100%',
        }}>

            {/* 1. TÍTULO DINÁMICO (Ahora aprovecha el espacio izquierdo) */}
            <div style={{ minWidth: '200px' }}>
                <h2 style={{
                    margin: 0,
                    fontSize: '1.4rem',
                    color: '#fff',
                    fontWeight: '600',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase'
                }}>
                    {title}
                </h2>
                <span style={{ fontSize: '0.75rem', color: '#bd8e48', opacity: 0.8, fontWeight: '500' }}>
                    SISTEMA DE GESTIÓN PRO
                </span>
            </div>

            {/* 2. BUSCADOR CENTRAL MEJORADO */}
            <div style={{ flex: 0.4, position: 'relative' }}>
                <Search
                    size={16}
                    color="#bd8e48"
                    style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}
                />
                <input
                    type="text"
                    placeholder="Buscar activos, transacciones..."
                    style={{
                        width: '100%',
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(189, 142, 72, 0.15)',
                        borderRadius: '12px',
                        padding: '12px 15px 12px 45px',
                        color: '#fff',
                        fontSize: '0.85rem',
                        outline: 'none',
                        transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#bd8e48'}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(189, 142, 72, 0.15)'}
                />
            </div>

            {/* 3. PERFIL Y NOTIFICACIONES */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>

                {/* Notificaciones con estilo ardiente sutil */}
                <div style={{
                    cursor: 'pointer',
                    position: 'relative',
                    padding: '8px',
                    borderRadius: '8px',
                    transition: 'background 0.3s'
                }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(189, 142, 72, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    <Bell size={20} color="#bd8e48" />
                    <span style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '7px',
                        height: '7px',
                        backgroundColor: '#ff4d4d',
                        borderRadius: '50%',
                        border: '1px solid #000'
                    }} />
                </div>

                {/* Perfil de Socio */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    paddingLeft: '20px',
                    borderLeft: '1px solid rgba(189, 142, 72, 0.2)'
                }}>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', color: '#fff', letterSpacing: '0.3px' }}>
                            Socio Pro-Finance
                        </p>
                        <p style={{ margin: 0, fontSize: '0.65rem', color: '#bd8e48', fontWeight: 'bold', textTransform: 'uppercase' }}>
                            Platinum Member
                        </p>
                    </div>

                    {/* Avatar con el estilo de la marca */}
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #bd8e48, #8a662d)',
                        border: '2px solid rgba(189, 142, 72, 0.4)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                    }}>
                        <User size={22} color="#000" />
                    </div>
                </div>
            </div>
        </header>
    );
};