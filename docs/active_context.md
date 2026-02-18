## Resumen de Cambios Arquitectónicos (Sesión 2026-02-12)

🏗️ 1. Implementación del Adapter Pattern (Backend)
Archivo: src/app/api/accounts/route.ts

Cambio: Se transformó la API para que actúe como un adaptador. En lugar de devolver solo datos del usuario, ahora genera un array de Cuentas Virtuales.

Propósito: Permitir que el sistema maneje múltiples perfiles (Normal, Socio) sin necesidad de haber modificado aún el esquema de la base de datos (Prisma).

Sincronización: Se conectó la "Cuenta Socio" con los campos reales availableBalance e investedCapital que utilizan los scripts de simulación de saldos.

🛡️ 2. Blindaje de Navegación (Guards)
Estado: Validado.

Lógica: Se implementó/verificó un flujo de seguridad donde el acceso al /dashboard está condicionado a la existencia de una activeAccount en el contexto.

Resultado: Si un usuario intenta saltarse el selector de cuentas o borra el activeAccountId de la memoria, el sistema lo expulsa automáticamente al selector.

🔄 3. Persistencia Determinista de Sesión de Cuenta
Mecanismo: LocalStorage + React Context.

Detalle: El sistema ahora genera IDs únicos basados en el rol y el ID real del usuario (socio_cmky...). Esto garantiza que la elección del usuario persista tras recargar la página (F5) sin perder la referencia a qué "cuenta" está operando.

🧩 4. Contrato de Integración (Estado Actual)
Fase: Ready for Integration.

Situación: El Frontend y el Contexto ya están "cableados" para recibir objetos de tipo Account con saldos independientes.

Pendiente: Una vez que se cree la tabla física Account, el Dashboard deberá migrar su fuente de datos: de la Sesión Global a la Cuenta Activa del AccountContext.

🎯 Estado Final de la Sesión:
La arquitectura es impenetrable en su flujo de navegación y flexible en su flujo de datos. Has demostrado que el sistema puede diferenciar roles y saldos en el Backend, dejando el camino despejado para que tu compañero integre la base de datos real sin fricciones.



## Estado de la Arquitectura - 12 de Febrero, 2026

### Logros:
- Implementado el "Account Selector Workflow" entre Login y Dashboard.
- Creado el Adapter en `api/accounts` para simular la tabla Account con datos reales del script de saldos.
- Validada la persistencia determinista (IDs generados dinámicamente: `role_userId`).
- Implementada la protección de rutas (Route Guard) para el Dashboard.

### Próximos pasos:
- Notificar al equipo sobre el "Contrato de Datos" requerido para la tabla Account.
- Refactorizar componentes visuales (BalanceCard) para desacoplarlos de la sesión global de Next-Auth.



/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


## Resumen de Cambios Arquitectónicos (Sesión 2026-02-18)
1. Evolución del Modelo de Datos (Prisma)
Se transformó el esquema de base de datos para soportar relaciones de red sin romper la compatibilidad con los Adapters existentes:

Identidad Atómica: Se añadió referralCode a cada usuario (generado al registro).

Trazabilidad: Implementación de relación autoperfecta en User (referredById) para conectar invitados con anfitriones.

Entidades de Recompensa: Creación de tablas Referral y ReferralReward para auditar cada comisión, evitando que el capital aparezca sin un origen trazable.

2. Motor de Comisiones e Idempotencia
Se desarrolló un "Core" de procesamiento (simulate_referral.js) que respeta reglas de negocio Enterprise:

Validación Cruzada: El sistema no paga por registro; busca en Transaction un type: DEPOSIT y status: COMPLETED.

Protección contra Duplicados: Implementación de check de seguridad que impide que una misma inversión genere múltiples comisiones (Idempotencia).

3. Integración con el Flujo de Inversión
Se creó create_test_investment.js para simular el flujo completo de entrada de capital (Transaction + Account Balance).

Esto garantiza que el AccountContext y los Hooks de Balance reflejen la comisión como un ingreso legítimo.

4. Refactorización de UX y Rutas (Fase 1 CSS-First)
Desactivación de Rutas Legacy: Se renombró la ruta de inversiones a _inversiones (Private Folder en Next.js).

Reasignación de QuickActions: El componente QuickActions.tsx ahora vincula el slot de "Nueva Inversión" a "Referidos".

Navegación SPA: Integración de useRouter para transiciones instantáneas entre el Home y la página de Referidos.


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

Sesión 18/02/2026 — Sistema de Referidos

Todo lo implementado y lo que tú añadiste queda documentado en el walkthrough. Resumen de la sesión completa:

Por el agente:

Schema + migración add_referral_system
referral.service.ts
 (motor de comisiones)
auth.ts
 con captura atómica del código de referido
api/referrals/route.ts
 + restricción en 
api/accounts/route.ts
dashboard/referidos/page.tsx
, 
Sidebar.tsx
, 
register/page.tsx
, 
TransactionHistory.tsx
simulate_referral.js
Por ti:

create_test_investment.js
 — script para crear la transacción de prueba
QuickActions.tsx
 — slot "Nueva Inversión" → "Referidos" con navegación SPA
Sidebar.tsx
 — "Inversiones" comentado (fuera de producción)
active_context.md
 — roadmap documentado
Para probar el flujo completo:

bash
# 1. Crear inversión para el usuario referido
node prisma/create_test_investment.js <email_usuario_b> 100000
# 2. Disparar la comisión
node prisma/simulate_referral.js <email_usuario_b>



🚀 Próximos Pasos (Roadmap Inmediato)
Para las siguientes sesiones, se recomienda priorizar:

Automatización del Motor (Webhooks/Triggers):

Actualmente el motor se dispara vía script manual (simulate_referral.js). El siguiente paso es integrarlo como un trigger automático en el backend cada vez que una transacción de depósito cambie a estado COMPLETED.

Sistema de Notificaciones en Tiempo Real:

Implementar un aviso (Toast o Notification Bell) para el Usuario A en el instante exacto en que un referido activa su cuenta o genera una comisión.

Ofuscación y Privacidad:

Refinar la tabla de referidos para mostrar nombres parciales (ej: Sam***l) y proteger los datos sensibles de los invitados.

Sistema de Retiros de Comisión:

Definir si las comisiones van a una "Caja de Comisiones" separada o se mezclan con el capital disponible, y establecer reglas de retiro específicas para este rubro.