# Contexto — Auth y acceso (2026-07-22)

## Qué pasó en verificación

- Magic link caducó (normal; Auth.js Nodemailer default ~24h).
- Tras reiniciar `pnpm dev`, abrir `http://localhost:3000` muestra el **index público** (intencional).
- Si la cookie de sesión + fila en SQLite siguen válidas, el usuario aparece logueado sin volver a pedir el link.

## Control de acceso

| Ruta / acción | Protegida |
|---------------|-----------|
| `/` search home | Pública |
| `/library`, `/onboarding` | Requieren sesión |
| `/u/[user]/customize`, `saveThemeAction` | Dueño + sesión |
| Mutaciones catalog/list | Server actions con `auth()` → redirect `/login` |
| `/u/[username]` perfil | Público |
| Logout en UI | Sí (`SiteHeader` → `signOut`) |
| Sign in / Profile en nav | Sí (según sesión) |

## UX magic link (feat/auth-ux)

- Tras enviar email → `/login/verify` (instrucciones + hint de consola en local).
- Link caducado/usado → `/login?error=Verification` con mensaje y CTA “Send a new magic link”.
- Post-login `callbackUrl=/library`; `/library` redirige a `/onboarding` si falta username (sin hop forzado en el callback de Auth.js).

## Decisión

**A hecha:** mejorar UX magic link (mantener ADR 003).  
**B diferida:** email + contraseña solo si A no basta en uso real.
