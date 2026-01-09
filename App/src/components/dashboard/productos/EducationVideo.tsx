"use client";
import React from 'react';
import { Play, BookOpen } from 'lucide-react';

export function EducationVideo() {
    return (
        <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '24px',
            padding: '24px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            height: '100%'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BookOpen size={20} color="#bd8e48" />
                <h3 style={{ color: '#fff', margin: 0, fontSize: '1.1rem' }}>Aprende Sobre Educación Financiera</h3>
            </div>

            <div
                style={{
                    width: '100%',
                    aspectRatio: '16/9',
                    backgroundColor: '#000',
                    borderRadius: '16px',
                    border: '1px solid rgba(189, 142, 72, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: 'inset 0 0 40px rgba(189, 142, 72, 0.1)' // Glow sutil interno
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#bd8e48';
                    e.currentTarget.style.boxShadow = 'inset 0 0 60px rgba(189, 142, 72, 0.2)';
                    const playBtn = e.currentTarget.querySelector('.play-btn') as HTMLElement;
                    if (playBtn) playBtn.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(189, 142, 72, 0.2)';
                    e.currentTarget.style.boxShadow = 'inset 0 0 40px rgba(189, 142, 72, 0.1)';
                    const playBtn = e.currentTarget.querySelector('.play-btn') as HTMLElement;
                    if (playBtn) playBtn.style.transform = 'scale(1)';
                }}
            >
                {/* Imagen de fondo decorativa (Placeholder de educación financiera) */}
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: 'url("https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=2070&auto=format&fit=crop")',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: 0.15, // Muy sutil para mantener el estilo oscuro
                    filter: 'grayscale(100%)',
                    zIndex: 1
                }} />

                {/* Botón de Play con clase para la animación */}
                <div
                    className="play-btn"
                    style={{
                        width: '60px', height: '60px',
                        backgroundColor: '#bd8e48',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 25px rgba(189, 142, 72, 0.5)',
                        zIndex: 2,
                        transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}
                >
                    <Play size={26} color="#000" fill="#000" />
                </div>

                {/* Overlay de gradiente inferior */}
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '40%',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                    zIndex: 1
                }} />
            </div>

            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: 0, lineHeight: '1.6' }}>
                Con este video aprenderás los inicios de un buen uso de tu capital y cómo seccionarlo para gastos e inversiones de la mejor manera.
            </p>
        </div>
    );
}