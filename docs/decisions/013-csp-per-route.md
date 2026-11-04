# 013 — Content-Security-Policy con nonce, dos políticas (app y perfil)

**Fecha:** 2026-11-04  
**Estado:** aceptada  
**Relacionada con:** ADR 005 (perfil HTML + CSS, Google Fonts), ADR 011 (perfiles sin prefijo de locale); auditoría `2026-11-04` (SEC-B7); plan `docs/superpowers/plans/2026-11-04-audit-remediation.md` (T1.12, discrepancia nº 9)

## Contexto

- La app no enviaba `Content-Security-Policy`. Ante un XSS no había una segunda barrera.
- El perfil público (`/u/<usuario>`) y la vista previa del editor (`/u/<usuario>/customize`) pintan el tema del usuario en un `<iframe sandbox srcdoc>`. **Un documento `srcdoc` hereda la CSP del documento padre.** Una única política estricta (`font-src 'self'`, sin Google Fonts) rompería las fuentes `@import` y las imágenes de los temas.
- Next.js aplica el nonce a sus scripts solo en render dinámico. Todas las rutas ya son dinámicas: el layout raíz lee `cookies()` y `headers()`.
- Hay un único script inline propio: la preferencia de tema en `src/app/layout.tsx`.

## Decisión

- `src/lib/security/csp.ts` → `buildCsp({ nonce, route, dev })`, una función pura con tests.
  - **Común:** `default-src 'self'; script-src 'self' 'nonce-<n>' 'strict-dynamic'` (y `'unsafe-eval'` solo en dev); `connect-src 'self'` (y `ws:` en dev, para HMR); `frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`; `img-src 'self' https: data:`.
  - **`app`** (todo lo que no es `/u/*`): `style-src 'self' 'unsafe-inline'; font-src 'self'`.
  - **`profile`** (`/u/*`, hereda el `srcdoc`): `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com`.
  - `style-src` no lleva nonce a propósito: con nonce, los navegadores ignoran `'unsafe-inline'`, y lo necesitan el `<style>` del tema y los `style` de React.
- `src/proxy.ts` genera un nonce por petición (16 bytes aleatorios en base64). Lo pasa en las cabeceras de la petición `x-nonce` y `content-security-policy`, de donde Next lo lee para sus scripts. Pone la política en la respuesta, también en las redirecciones.
- El matcher del proxy ahora incluye `/u/`. En `/u/*` el proxy solo añade la CSP, sin lógica de locale.
- `layout.tsx` pone `nonce` (leído de `x-nonce`) en el script del tema.
- **Rollback rápido:** `CSP_REPORT_ONLY=1` envía la misma política como `Content-Security-Policy-Report-Only`.

## Alternativas consideradas

- **Una sola política para todo:** o es laxa en toda la app (Google Fonts en todas partes) o rompe los temas. Se descarta.
- **CSP propia dentro del `srcdoc` (`<meta http-equiv>`):** solo puede **añadir** restricciones a la heredada, nunca relajarlas. No resuelve el problema.
- **Hashes en vez de nonce:** obligan a recalcular el hash al tocar el script, y Next no los aplica a sus propios scripts inline. Se descarta.
- **Saltar las peticiones de prefetch en el matcher** (como sugiere la guía de Next): esas peticiones también necesitan la lógica de locale del proxy. Se mantienen.

## Consecuencias

- Un script inyectado sin nonce no se ejecuta, ni los manejadores inline (`onerror=`, etc.). En el perfil hay dos barreras: el sandbox sin `allow-scripts` (ADR 005) y `script-src`.
- Los temas solo pueden cargar fuentes de `fonts.gstatic.com`. Un `@font-face` con `url()` HTTPS de otro dominio queda bloqueado por `font-src`. Es coherente con la regla «solo Google Fonts».
- Las imágenes de temas y portadas siguen funcionando con cualquier URL HTTPS (`img-src https:`). Las de `http:` ya se rechazaban al validar el CSS y al pintar las portadas.
- Toda página tiene que seguir siendo dinámica. Una página estática se serviría sin nonce y Next no podría ejecutar sus scripts.
- `X-Frame-Options: DENY` (en `next.config.ts`) y `frame-ancestors 'none'` dicen lo mismo. Se mantienen ambas por compatibilidad.
