# 016 — Entorno de auth validado al arrancar, magic link de 15 min, email estricto y límite único

**Fecha:** 2026-11-05  
**Estado:** aceptada  
**Relacionada con:** ADR 003 (magic link), ADR 012 (`instrumentation.ts`), ADR 014 (rate limits en SQLite, IP de confianza); auditoría `2026-11-04` (SEC-B1, SEC-B2, SEC-B3, SEC-M3, FUN-P2-9); plan `docs/superpowers/plans/2026-11-04-audit-remediation.md` (T1.3, discrepancias nº 10 y 20; decisión D11)

## Contexto

- **SEC-B1.** Auth.js construye los enlaces con `AUTH_URL`. Sin él y con `AUTH_TRUST_HOST`, los construye con la cabecera `Host` / `X-Forwarded-Host` de la petición: un atacante puede pedir un enlace para la víctima que apunte a su dominio. Nada obligaba a usar `https://` en producción.
- **SEC-B2.** Solo se comprobaba que `AUTH_SECRET` existiera. El valor de `.env.example` o un secreto corto pasaban.
- **SEC-B3.** Los enlaces caducaban a las 24 h (valor por defecto de Auth.js). El límite de envío estaba en `sendVerificationRequest`, que Auth.js ejecuta **en paralelo** con `createVerificationToken`: un envío rechazado dejaba igualmente una fila en `verification_tokens`.
- **SEC-M3.** El email solo se pasaba a minúsculas. Paréntesis (comentarios), comas, `;`, `<>` o comillas pueden hacer que un parser de correo lea otro destinatario. El `＠` de ancho completo solo se convierte en `@` tras NFKC.
- **FUN-P2-9.** Había dos límites independientes con normalizaciones distintas: el de la action del login (`login:email:`, `login:ip:`) y el de `sendVerificationRequest` (`magic-link:`, colapsando `+alias`). Cuando saltaba el segundo, Auth.js devolvía `?error=Configuration` en vez de `RateLimited`.
- `next build` corre con `NODE_ENV=production` y un secreto de usar y tirar (`AUTH_SECRET=build-only-secret`). En desarrollo se copia `.env.example` tal cual.

## Decisión

- **Validación del entorno al arrancar, no al importar.** `src/lib/auth/env.ts` → `validateAuthEnv(env)` (pura, con tests) y `assertAuthEnvOrExit()`, que se llama en `register()` de `src/instrumentation.ts` antes de migrar. No se ejecuta en `phase-production-build` ni en Edge. `next start` solo registra un fallo del hook y sigue sirviendo, así que en producción se hace `process.exit(1)` con un mensaje `[listae auth] Refusing to start: …`.
  - Siempre error: falta `AUTH_SECRET`; `AUTH_TRUST_HOST` sin `AUTH_URL`; `AUTH_URL` que no es una URL http(s) absoluta o lleva credenciales.
  - Error en producción, aviso fuera de ella: `AUTH_SECRET` igual al de `.env.example` o con menos de 32 bytes de entropía estimada (hex = 4 bits por carácter, base64/base64url = 6, resto = 8; menos de 12 caracteres distintos cuenta como 0). Así `openssl rand -base64 32` (44 caracteres) y `openssl rand -hex 32` (64) pasan, y `pnpm dev` sigue funcionando con `.env.example` copiado.
  - Solo producción: `AUTH_URL` obligatorio y `https://`; `EMAIL_SERVER` obligatorio (sin él los enlaces no se envían nunca).
- **Magic link de 15 minutos** (`MAGIC_LINK_MAX_AGE_SECONDS = 900`, D11) en el provider Nodemailer. El texto de "enlace enviado" lo dice.
- **Email estricto.** `normalizeEmail` (NFKC + trim + minúsculas) e `isStrictEmail` (≤ 254, una `@`, parte local dot-atom ≤ 64 sin comillas, paréntesis, espacios, `<>`, `;` ni comas; dominio ASCII con ≥ 2 etiquetas `[a-z0-9-]` de hasta 63). Se aplican en la action del login (`?error=EmailInvalid`, clave `auth.errorEmailInvalid`) y como `normalizeIdentifier` del provider, que también cubre los POST directos a `/api/auth/signin/nodemailer` y se ejecuta antes de generar el token.
- **Un único límite, en `callbacks.signIn`.** Auth.js lo llama antes de generar y guardar el token, así que un rechazo no deja filas huérfanas. Primero `magic-link:ip:<bucket>` (20 / h, solo con IP de confianza, ADR 014) y después `magic-link:email:<email normalizado sin +alias>` (5 / h). Al rechazar devuelve `/<locale>/login?error=RateLimited` (locale de `x-listae-locale` o de la cookie `listae-locale`; si no, `es`). `safeReturnPath` admite ahora `/(es|en)/login?error=<Letras>`, porque `callbacks.redirect` filtra esa URL. La action del login ya no tiene límite propio.

## Alternativas consideradas

- **Validar al importar `config.ts`:** rompe `next build`. Se descarta.
- **Límite por IP en `sendVerificationRequest` (lo que proponía el plan):** se ejecuta a la vez que se crea el token, así que deja filas huérfanas hasta la purga de T2.2 y devuelve `Configuration`. Se descarta.
- **Mantener el límite de la página además del de Auth.js:** dos contadores con normalizaciones distintas para el mismo recurso. Se descarta.
- **Rechazar el secreto de ejemplo también en desarrollo:** obligaría a editar `.env.local` antes del primer `pnpm dev`. Se prefiere un aviso.
- **Medir la entropía real del secreto:** imposible desde el valor. La estimación por alfabeto descarta los casos obvios (corto, repetitivo, hex de 16 bytes).

## Consecuencias

- **Producción exige** `AUTH_SECRET` fuerte, `AUTH_URL=https://…` y `EMAIL_SERVER`. Un `pnpm start` local con `.env.local` de desarrollo ya no arranca.
- Direcciones con dominios IDN sin punycode o partes locales entre comillas ya no pueden pedir enlace.
- Los enlaces pendientes de más de 15 minutos dejan de valer tras el despliegue (los emitidos antes conservan su caducidad de 24 h en la fila).
- `signIn` lee `headers()` de `next/headers` (fuera de una petición se usa un objeto vacío: IP desconocida, locale por defecto).
- Rollback: revertir el PR.
