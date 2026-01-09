"use client";
import React from 'react';

export function ActivitySection() {
    const transactions = [
        { id: 1, type: 'Depósito', amount: '+$5,000.00', date: 'Hoy, 14:20', status: 'Completado', color: '#4caf50' },
        { id: 2, type: 'Retiro', amount: '-$1,200.00', date: 'Ayer', status: 'Completado', color: '#fff' },
        { id: 3, type: 'Inversión', amount: '-$2,500.00', date: '2 Ene', status: 'Pendiente', color: '#bd8e48' },
        { id: 4, type: 'Bono', amount: '+$150.00', date: '1 Ene', status: 'Completado', color: '#4caf50' },
        { id: 5, type: 'Depósito', amount: '+$1,000.00', date: '30 Dic', status: 'Completado', color: '#4caf50' },
    ];

    return (
        <div style={{ position: 'relative' }}>
            <style>
                {`
                    @keyframes floatParticlesActivity {
                        0% { background-position: 0% 0%; }
                        100% { background-position: 100% 100%; }
                    }
                    .glass-container-activity {
                        position: relative;
                        background: #080808;
                        border-radius: 24px;
                        border: 1px solid rgba(189, 142, 72, 0.3);
                        overflow: hidden;
                        padding: 30px;
                        height: 400px;
                        display: flex;
                        flex-direction: column;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                    }
                    .particles-overlay-activity {
                        position: absolute;
                        top: 0; left: 0; right: 0; bottom: 0;
                        background-image: url("https://www.transparenttextures.com/patterns/stardust.png");
                        opacity: 0.15;
                        pointer-events: none;
                        animation: floatParticlesActivity 60s linear infinite;
                        z-index: 0;
                    }
                    .custom-scroll::-webkit-scrollbar {
                        width: 4px;
                    }
                    .custom-scroll::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scroll::-webkit-scrollbar-thumb {
                        background: rgba(189, 142, 72, 0.2);
                        border-radius: 10px;
                    }
                    .custom-scroll {
                        scrollbar-width: thin;
                        scrollbar-color: rgba(189, 142, 72, 0.2) transparent;
                    }
                `}
            </style>

            <div className="glass-container-activity">
                <div className="particles-overlay-activity" />

                <div style={{ position: 'relative', zIndex: 2, marginBottom: '20px' }}>
                    <h3 style={{
                        color: 'rgba(189, 142, 72, 0.8)',
                        margin: 0,
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                    }}>
                        Actividad Reciente
                    </h3>
                </div>

                <div className="custom-scroll" style={{
                    position: 'relative',
                    zIndex: 1,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    overflowY: 'auto',
                    paddingRight: '8px'
                }}>
                    {transactions.map((tx) => (
                        <div key={tx.id} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 8px',
                            borderBottom: '1px solid rgba(189, 142, 72, 0.08)',
                            transition: 'background 0.3s'
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(189, 142, 72, 0.03)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: '500' }}>{tx.type}</span>
                                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>{tx.date}</span>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ color: tx.color, fontSize: '0.95rem', fontWeight: '700' }}>{tx.amount}</span>
                                <span style={{
                                    color: tx.status === 'Pendiente' ? '#bd8e48' : 'rgba(255,255,255,0.2)',
                                    fontSize: '0.65rem',
                                    textTransform: 'uppercase',
                                    fontWeight: '700'
                                }}>{tx.status}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* BOTÓN RESTAURADO A TU ESTILO ORIGINAL */}
                <button
                    className="btn-primary"
                    style={{
                        marginTop: '20px',
                        width: '100%',
                        padding: '0.8rem',
                        cursor: 'pointer'
                    }}
                >
                    Ver Historial completo
                </button>
            </div>
        </div>
    );
}