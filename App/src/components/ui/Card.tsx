"use client";
import React from 'react';

interface CardProps {
    children: React.ReactNode;
    title?: string;
}

export function Card({ children, title }: CardProps) {
    return (
        <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '24px',
            padding: '30px',
            border: '1px solid rgba(189, 142, 72, 0.15)', // Tu dorado institucional
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {title && (
                <h3 style={{
                    fontSize: '1rem',
                    color: 'rgba(255,255,255,0.5)',
                    marginBottom: '20px',
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    fontWeight: '500'
                }}>
                    {title}
                </h3>
            )}
            {children}
        </div>
    );
}
