# Hardening y calidad (2026-10-20)

Rama `chore/project-hardening`. Revisión completa del repo (servidor, UI,
higiene) y corrección de lo verificado.

## Estado de partida

- `pnpm build` **fallaba en `main`**: la regex de `@import` (PR #12) usaba el
  flag `/s`, no disponible con `target: ES2017`. Vitest no lo detectaba.
- `pnpm lint` fallaba (`setState` síncrono en un effect de `ThemeToggle`).
- No había CI ni script `typecheck`.

## Cambios

**Tooling:** `.github/workflows/ci.yml` (lint, typecheck, test, build),
script `pnpm typecheck`, `engines` y `packageManager` en `package.json`. Se
eliminaron los SVG de `create-next-app` sin referencias.

**Seguridad / DoS (servidor):**

- Tema: límite de 64 KB para CSS y HTML; validador CSS lineal, con un máximo
  de 20 errores y snippets de 120 caracteres. Rechaza escapes `\` fuera de
  strings, `url(` sin cerrar, `image-set()` y `src()`.
- Placeholders en una sola pasada: los títulos (controlados por el usuario) ya
  no se reescanean y `$` se trata como literal.
- Rate limiter con memoria acotada (10k claves; las claves largas se guardan
  como hash). La IP sale del último salto de `X-Forwarded-For`.
- Throttle del magic link también en `sendVerificationRequest`, para cubrir
  los POST directos a `/api/auth/signin/nodemailer`.
- `?error=constructor` en login ya no da 500 (`Object.hasOwn`).
- Fetch a TMDB/Open Library con timeout de 8 s. La búsqueda solo gasta cupo
  de IP en los cache miss y no cachea resultados parciales si cae un proveedor.
- Progreso, totales y año como enteros seguros acotados. Un total de 0 se
  trata como desconocido. Onboarding: no permite renombrar a quien ya tiene
  username y gestiona la carrera por `users_username_unique`.
- Sanitizer: etiquetas estructurales inertes (`header`, `main`, `aside`,
  `strong`…), que necesita `docs/themes/mal-dark-sirisoto.md`.

**UI / i18n:**

- Cookie `listae-locale`: las redirecciones sin prefijo (server actions,
  Auth.js) mantienen el idioma en el que navegaba el usuario.
- `<html lang>` se renderiza en el servidor y el selector de idioma conserva
  la query.
- Textos localizados: editor de tema, picker de dominio, tipos de obra,
  fuentes y metadata. Las pistas de «enlace en consola» solo aparecen sin SMTP.
- `SubmitButton` con estado pendiente en todos los formularios (evita dobles
  envíos y emails duplicados).
- Arreglos: búsqueda duplicada al montar, crash con `?q=a&q=b`, página de
  título caída si el proveedor falla, año `0` pintado, picker de colores
  desincronizado con el CSS editado a mano.

## Pendientes del PR, resueltos

- **Enlaces del perfil público:** el iframe usa
  `sandbox="allow-top-navigation-by-user-activation"` y
  `<base target="_top">`. Un clic real navega la pestaña completa; scripts,
  formularios, popups y acceso same-origin siguen bloqueados. Cualquier
  enlace `https` del HTML del usuario también navega al hacer clic, igual que
  un enlace en cualquier perfil. El preview del editor mantiene `sandbox=""`
  para que un clic no tire los cambios sin guardar.
- **Errores de formulario:** las acciones de entradas y de alta manual
  devuelven `FormState` con el mensaje traducido (`formErrors.*`,
  `FormInputError`). `ActionForm` envía desde `onSubmit` dentro de una
  transición, así React no resetea los campos y `SubmitButton` sigue viendo
  el estado pendiente.
- **`fillMissingWorkLocale`:** guarda el intento en `search_cache`
  (`locale-fill:<locale>:<workId>`, 7 días; 15 min si falla el proveedor), sin
  cambiar el schema.
- **Páginas de estado:** `loading`, `error` y `not-found` localizados en
  `[locale]`, más un `not-found` raíz. El idioma sale de la cabecera del
  middleware o de la cookie.

## Pendiente

- Siguen en inglés los mensajes del validador CSS, las unidades de progreso y
  el tipo de obra en la tabla del perfil público.
- Login y onboarding redirigen con `?error=` y vacían su único campo.
- Portabilidad a Postgres: `.get()` y `.run()` síncronos de better-sqlite3,
  `NULLS LAST` y orden de títulos sin distinguir mayúsculas.
- Next 16 depreca `middleware.ts` en favor de `proxy.ts`.
