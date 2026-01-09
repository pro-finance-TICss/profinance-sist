"use client";
import React from 'react';
import { X } from 'lucide-react';

interface ActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export function ActionModal({ isOpen, onClose, title, children }: ActionModalProps) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
        }}>
            {/* Overlay con el desenfoque del login */}
            <div
                onClick={onClose}
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(8px)', // Desenfoque similar al container del login
                    animation: 'fadeIn 0.3s ease'
                }}
            />

            {/* Ventana del Modal con estilo "auth-card" */}
            <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: '420px', // Un poco más estrecho, como los formularios de login
                backgroundColor: 'rgba(255, 255, 255, 0.02)', // Transparencia sutil
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.08)', // Borde fino tipo cristal
                borderRadius: '24px',
                padding: '40px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                animation: 'modalFadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>

                <style>
                    {`
                        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                        @keyframes modalFadeUp { 
                            from { opacity: 0; transform: translateY(10px) scale(0.98); } 
                            to { opacity: 1; transform: translateY(0) scale(1); } 
                        }
                    `}
                </style>

                {/* Header estilizado */}
                <div style={{
                    textAlign: 'center', // Centrado como los headers de auth
                    marginBottom: '32px',
                    position: 'relative'
                }}>
                    <h2 style={{
                        color: '#fff',
                        fontSize: '1.4rem',
                        fontWeight: '500',
                        margin: 0,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase' // Estilo corporativo del login
                    }}>
                        {title}
                    </h2>

                    {/* Botón cerrar minimalista */}
                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute',
                            right: '-10px',
                            top: '-10px',
                            background: 'none',
                            border: 'none',
                            color: 'rgba(255,255,255,0.3)',
                            cursor: 'pointer',
                            padding: '5px'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Contenido del Formulario */}
                <div style={{ width: '100%' }}>
                    {children}
                </div>
            </div>
        </div>
    );
}