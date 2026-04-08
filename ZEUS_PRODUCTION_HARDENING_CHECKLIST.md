# Zeus: Checklist de Cierre y Hardening de Producción

Este documento reemplaza el checklist anterior centrado en Zeleri.

Hoy Zeus ya opera con:

- Mercado Pago embebido para cobro one shot
- webhook de Mercado Pago activo
- reconciliación de `pending` expirados para agenda
- panel `/v2` aprobado como nueva dirección administrativa

El objetivo ahora no es "activar pagos", sino cerrar Zeus como producto operativo, seguro y mantenible.

## Objetivo

Dejar Zeus en estado:

- administrable con login real
- seguro en endpoints sensibles
- consistente en agenda, pagos y descargas
- modularizado en los flujos críticos para futura reutilización

## Estado actual ya resuelto

- Mercado Pago cobra en producción
- el webhook sincroniza reservas de servicio
- los `pending` expirados dejan de bloquear disponibilidad en la próxima consulta
- `/v2` ya sirve como base aprobada para el panel nuevo
- agenda `/v2` ya muestra solo estados operativos y no ensucia con `failed`

## Pendientes prioritarios

### 1. Login real de admin

Objetivo: sacar la dependencia del bypass temporal y proteger el panel correctamente.

Checklist:

- proteger `/admin`
- proteger `/v2`
- exigir sesión válida en endpoints administrativos
- definir claramente rol o criterio de usuario administrador

Resultado esperado:

- panel usable solo por administrador autenticado

### 2. Cierre de bypasses y endpoints administrativos

Objetivo: eliminar la superficie temporal que hoy existe para facilitar operación manual.

Checklist:

- eliminar o desactivar `x-zeus-bypass`
- eliminar o cerrar `/api/zeus/auth/create-admin`
- proteger:
  - `/api/zeus/admin/products`
  - `/api/zeus/admin/services`
  - `/api/zeus/admin/upload`
  - `/api/zeus/admin/upload-url`

Resultado esperado:

- no quedan endpoints administrativos abiertos o semiabiertos

### 3. Endurecer flujo de productos digitales

Objetivo: asegurar que el acceso al activo digital dependa del pago real.

Checklist:

- revisar `/api/zeus/download/token`
- impedir emisión de token premium sin pago validado
- revisar `/api/zeus/download/check`
- evitar exposición de tokens por referencias predecibles
- revisar caducidad, uso único y reutilización de tokens vigentes

Resultado esperado:

- un producto premium no entrega acceso sin autorización real

### 4. Revisar endpoints heredados de enrollment/Zeleri

Objetivo: dejar claro qué queda activo y qué queda como fallback técnico.

Checklist:

- revisar `/api/zeus/enroll/cards`
- revisar `/api/zeus/enroll/pay`
- confirmar si siguen expuestos públicamente o deben restringirse
- mantener Zelery solo como fallback técnico, no como flujo principal

Resultado esperado:

- los endpoints legacy no introducen riesgo ni confusión operativa

### 5. Consolidar modularización reusable

Objetivo: dejar los bloques de negocio más fáciles de portar a proyectos como Caprex.

Estado ya iniciado:

- `src/modules/digital-access/tokens.ts`
- `src/modules/payments/mercadopago.ts`

Siguiente checklist:

- extraer `agenda-core`
- consolidar `payment-core`
- separar claramente:
  - compra
  - entitlement/acceso
  - delivery

Resultado esperado:

- Zeus deja módulos probados reutilizables en otros proyectos

## Riesgos aún vigentes

- `src/app/api/zeus/auth/create-admin/route.ts`
  - no debe quedar público
- `src/app/api/zeus/admin/services/route.ts`
  - mantiene bypass temporal
- `src/app/api/zeus/admin/products/route.ts`
  - requiere auth admin real
- `src/app/api/zeus/admin/upload/route.ts`
  - requiere auth admin real
- `src/app/api/zeus/download/token/route.ts`
  - hoy todavía necesita hardening de pago real
- `src/app/api/zeus/download/check/route.ts`
  - necesita revisión por predictibilidad
- `src/app/api/zeus/enroll/cards/route.ts`
  - necesita revisión de exposición

## Smoke Test de Cierre

Antes de dar Zeus por cerrado:

- `npm run build`
- navegar sitio público
- entrar a panel admin con login real
- crear y editar servicio
- bloquear y liberar agenda
- publicar producto
- comprar producto
- validar acceso digital post pago
- reservar servicio y pagar
- confirmar agenda y pagos en admin
- revisar logs del servidor

## Siguiente paso recomendado

Orden sugerido de trabajo:

1. login real de admin
2. cierre de bypasses
3. hardening de productos digitales
4. modularización adicional
5. smoke test final
