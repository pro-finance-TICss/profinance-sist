"use client";
import React from 'react';

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer style={styles.footer}>
            <div style={styles.container}>
                <div style={styles.footerGrid}>

                    {/* Brand & Disclaimer */}
                    <div style={styles.brandCol}>
                        <div style={styles.footerBrand}>
                            <img
                                src="/logo-unificado.png"
                                alt="Pro-Finance logo"
                                style={styles.footerLogoImg}
                            />
                            <span style={styles.brandName}>PRO-FINANCE</span>
                        </div>
                        <p style={styles.disclaimer}>
                            Gestión de activos privados con los más altos estándares de seguridad y rentabilidad en el mercado global.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div style={styles.footerCol}>
                        <h3 style={styles.footerColH3}>Enlaces</h3>
                        <ul style={styles.footerLinks}>
                            <li style={styles.footerLi}><a href="/#hero" style={styles.footerA}>Inicio</a></li>
                            <li style={styles.footerLi}><a href="/conocenos" style={styles.footerA}>Conócenos</a></li>
                            <li style={styles.footerLi}><a href="/#beneficios" style={styles.footerA}>Beneficios</a></li>
                            <li style={styles.footerLi}><a href="/#faq" style={styles.footerA}>FAQ y Contacto</a></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div style={styles.footerCol}>
                        <h3 style={styles.footerColH3}>Legal</h3>
                        <ul style={styles.footerLinks}>
                            <li style={styles.footerLi}><a href="#" style={styles.footerA}>Términos y Condiciones</a></li>
                            <li style={styles.footerLi}><a href="#" style={styles.footerA}>Política de Privacidad</a></li>
                            <li style={styles.footerLi}><a href="#" style={styles.footerA}>Advertencia de Riesgo</a></li>
                        </ul>
                    </div>

                    {/* Social Media */}
                    <div style={styles.footerCol}>
                        <h3 style={styles.footerColH3}>SÍGUENOS</h3>
                        <div style={styles.socialLinks}>
                            <a href="#" style={styles.socialIcon}>f</a>
                            <a href="#" style={styles.socialIcon}>x</a>
                            <a href="#" style={styles.socialIcon}>in</a>
                        </div>
                    </div>
                </div>

                <div style={styles.footerBottom}>
                    <p style={styles.footerBottomP}>&copy; {currentYear} PRO-FINANCE ASSET MANAGEMENT. Todos los derechos reservados.</p>
                </div>
            </div>
        </footer>
    );
}

// Estilos convertidos de Astro a JS
const styles: { [key: string]: React.CSSProperties } = {
    footer: {
        backgroundColor: '#000',
        padding: '4rem 0 2rem',
        borderTop: '1px solid rgba(189, 142, 72, 0.1)',
        marginTop: 'auto',
        width: '100%',
    },
    container: {
        width: '90%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 1rem',
    },
    footerGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '3rem',
        marginBottom: '3rem',
    },
    brandCol: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.2rem',
    },
    footerBrand: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.8rem',
    },
    footerLogoImg: {
        width: '45px',
        height: 'auto',
    },
    brandName: {
        fontSize: '1.3rem',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        fontWeight: 'bold',
        color: '#bd8e48', // Color dorado de la marca
    },
    disclaimer: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: '0.85rem',
        lineHeight: '1.6',
        maxWidth: '300px',
    },
    footerColH3: {
        fontSize: '0.9rem',
        color: '#fff',
        marginBottom: '1.5rem',
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
    },
    footerLinks: {
        listStyle: 'none',
        padding: 0,
        margin: 0,
    },
    footerLi: {
        marginBottom: '0.8rem',
    },
    footerA: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: '0.9rem',
        textDecoration: 'none',
        transition: 'color 0.3s',
    },
    socialLinks: {
        display: 'flex',
        gap: '1rem',
    },
    socialIcon: {
        width: '32px',
        height: '32px',
        border: '1px solid #bd8e48',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#bd8e48',
        textDecoration: 'none',
        fontSize: '0.8rem',
        transition: 'all 0.3s ease',
    },
    footerBottom: {
        textAlign: 'center',
        paddingTop: '2rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    },
    footerBottomP: {
        color: 'rgba(255,255,255,0.2)',
        fontSize: '0.8rem',
    }
};