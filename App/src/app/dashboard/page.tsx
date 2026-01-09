"use client";
import React, { useState, useEffect } from 'react';

// IMPORTACIONES
import { DashboardHeader } from '../../components/dashboard/DashboardHeader';
import { Sidebar } from '../../components/ui/Sidebar';
import { BalanceSection } from '../../components/dashboard/BalanceSection';
import { ActivitySection } from '../../components/dashboard/ActivitySection';
import { QuickActions } from '../../components/dashboard/QuickActions';
import { SummaryCards } from '../../components/dashboard/SummaryCards';
import { Footer } from '../../components/ui/Footer';
import { ActionModal } from '../../components/dashboard/ActionModal';
import { DepositForm } from '../../components/dashboard/DepositForm';
import { Menu, X } from 'lucide-react';

// IMPORTACIONES DE SECCIONES
import { ProductsView } from '../../components/dashboard/productos/ProductsView';

// ✅ IMPORTACIONES INDIVIDUALES DE AJUSTES PARA DIFERENCIAR SECCIONES
import { ProfileSettings } from '../../components/dashboard/ajustes/ProfileSettings';
import { SecuritySettings } from '../../components/dashboard/ajustes/SecuritySettings';
import { GeneralSettings } from '../../components/dashboard/ajustes/GeneralSettings';

export default function DashboardPage() {
    const [activeSection, setActiveSection] = useState('Dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // --- ESTADOS PARA EL MODAL ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState({ title: '', type: '' });

    const handleOpenModal = (title: string, type: string) => {
        setModalConfig({ title, type });
        setIsModalOpen(true);
    };
    // ---------------------------------------

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div style={{
            display: 'flex',
            height: '100vh',
            width: '100vw',
            backgroundColor: '#000',
            overflow: 'hidden',
            position: 'relative'
        }}>

            {/* 🦅 EL LOGO DEL ÁGUILA */}
            <div style={{
                position: 'fixed',
                top: '50%',
                left: isMobile ? '50%' : '62%',
                transform: 'translate(-50%, -50%)',
                width: isMobile ? '250vw' : '100vh',
                height: isMobile ? '250vw' : '100vh',
                backgroundImage: 'url("/Background-recortado.png")',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'contain',
                opacity: 0.04,
                pointerEvents: 'none',
                zIndex: 0,
            }} />

            {/* SIDEBAR */}
            <aside style={{
                width: '260px',
                flexShrink: 0,
                backgroundColor: '#000',
                borderRight: '1px solid rgba(189, 142, 72, 0.1)',
                zIndex: 100,
                position: isMobile ? 'absolute' : 'relative',
                left: isMobile ? (isMobileMenuOpen ? '0' : '-260px') : '0',
                transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                height: '100%'
            }}>
                <Sidebar activeItem={activeSection} setActiveItem={(item) => {
                    setActiveSection(item);
                    if (isMobile) setIsMobileMenuOpen(false);
                }} />
            </aside>

            {/* OVERLAY MENÚ MÓVIL */}
            {isMobile && isMobileMenuOpen && (
                <div
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        zIndex: 90,
                        backdropFilter: 'blur(4px)'
                    }}
                />
            )}

            {/* CONTENEDOR DERECHO */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                zIndex: 5,
                position: 'relative',
                backgroundColor: 'transparent'
            }}>

                {isMobile && (
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            left: '20px',
                            zIndex: 80,
                            background: 'rgba(189, 142, 72, 0.1)',
                            border: '1px solid rgba(189, 142, 72, 0.3)',
                            borderRadius: '8px',
                            padding: '8px',
                            color: '#bd8e48'
                        }}
                    >
                        <Menu size={24} />
                    </button>
                )}

                <DashboardHeader title={activeSection} />

                <main style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: 'transparent'
                }}>

                    <div style={{
                        padding: isMobile ? '20px' : '30px 40px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: isMobile ? '1.5rem' : '2.5rem',
                        marginTop: isMobile ? '40px' : '0'
                    }}>

                        <div>
                            <h1 style={{ fontSize: isMobile ? '1.4rem' : '1.8rem', color: '#fff', margin: 0 }}>
                                {activeSection === 'Dashboard' || activeSection === 'Inicio' ? 'Resumen Financiero' : activeSection}
                            </h1>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                                {activeSection === 'Dashboard' || activeSection === 'Inicio'
                                    ? 'Monitorea tus activos en tiempo real.'
                                    : `Gestiona tu sección de ${activeSection}.`}
                            </p>
                        </div>

                        {/* --- RENDERIZADO CONDICIONAL DE SECCIONES --- */}
                        {(activeSection === 'Dashboard' || activeSection === 'Inicio') ? (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(12, 1fr)',
                                gap: '24px',
                            }}>
                                <div style={{ gridColumn: isMobile ? 'span 12' : 'span 8' }}>
                                    <BalanceSection />
                                </div>
                                <div style={{ gridColumn: isMobile ? 'span 12' : 'span 4' }}>
                                    <ActivitySection />
                                </div>

                                <div style={{ gridColumn: 'span 12' }}>
                                    <SummaryCards />
                                </div>

                                <div style={{ gridColumn: 'span 12' }}>
                                    <QuickActions onActionClick={handleOpenModal} />
                                </div>
                            </div>
                        ) : activeSection === 'Productos' ? (
                            <ProductsView />
                        ) : activeSection === 'Seguridad' ? (
                            /* ✅ VISTA ESPECÍFICA DE SEGURIDAD */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <SecuritySettings />
                            </div>
                        ) : activeSection === 'Ajustes' ? (
                            /* ✅ VISTA ESPECÍFICA DE AJUSTES GENERALES */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <ProfileSettings />
                                <GeneralSettings />
                            </div>
                        ) : (
                            <div style={{
                                padding: '40px',
                                textAlign: 'center',
                                color: 'rgba(255,255,255,0.2)',
                                border: '1px dashed rgba(255,255,255,0.1)',
                                borderRadius: '24px'
                            }}>
                                <p>Sección de {activeSection} en desarrollo...</p>
                            </div>
                        )}
                        {/* -------------------------------------------- */}

                    </div>

                    <div style={{ paddingBottom: '100px' }}></div>
                    <Footer />
                </main>
            </div>

            {/* --- COMPONENTE MODAL --- */}
            <ActionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={modalConfig.title}
            >
                {modalConfig.type === 'deposit' ? (
                    <DepositForm />
                ) : (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <p>Formulario de {modalConfig.title} en Proceso...</p>
                    </div>
                )}
            </ActionModal>

        </div>
    );
}