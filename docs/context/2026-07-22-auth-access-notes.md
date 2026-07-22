# Contexto — Auth y acceso (2026-07-22)

## Qué pasó en verificación

- Magic link caducó (normal; Auth.js Nodemailer default ~24h).
- Tras reiniciar `pnpm dev`, abrir `http://localhost:3000` muestra el **index público** (no es un bypass de seguridad).
- Si la cookie de sesión + fila en SQLite siguen válidas, el usuario aparece logueado (avatar / “Open my library”) sin volver a pedir el link.

## Control de acceso actual (revisión)

| Ruta / acción | Protegida |
|---------------|-----------|
| `/` search home | Pública (intencional) |
| `/library`, `/onboarding` | Requieren sesión |
| `/u/[user]/customize`, `saveThemeAction` | Dueño + sesión |
| Mutaciones catalog/list | Server actions con `auth()` → redirect `/login` |
| `/u/[username]` perfil | Público (intencional) |
| Logout en UI | **No existe** (gap UX) |
| Link Login en nav | **No existe** cuando estás logueado/out |

Conclusión: **no hay agujero grave de “entrar sin auth” a datos privados**; el problema principal es **UX de sesión** (sin logout, sin feedback claro, link caducado confuso, `/` no redirige).

## Decisión pendiente

**A (recomendada):** Mejorar magic link — logout, nav Login/Logout/perfil, mensaje “link caducado / reenvía”, quitar hop onboarding innecesario, opcional middleware.

**B:** Migrar a email/usuario + contraseña (más trabajo: hash, reset, rate limit, signup; 3–5 días básico / más si producción).

Usuario abierto a B si A resulta complicado. A es más barata y mantiene el spec (ADR 003).

## Repo

PRs #1 y #2 mergeados a `main`. Trabajo local debe hacerse desde `main` actualizado.
