# 012 — Migraciones al arrancar (instrumentation) + SQLite en WAL

**Fecha:** 2026-11-04  
**Estado:** aceptada  
**Relacionada con:** ADR 002 (SQLite + Drizzle); auditoría `2026-11-04` (FUN-P0-1, FUN-P0-2, DOC-M6); plan `docs/superpowers/plans/2026-11-04-audit-remediation.md` (T0.2)

## Contexto

- La BBDD se creaba con `pnpm db:push`: sin historial (`__drizzle_migrations`), sin forma de aplicar cambios de esquema sobre datos reales y con el README pidiendo un paso manual que nadie recuerda en un deploy.
- El migrador de Drizzle (`drizzle-orm/sqlite-core/dialect.js`, `migrate`) lee el diario **antes** de `BEGIN`. Si migra cada worker al importar `db`, dos procesos pueden decidir a la vez que `0000` está pendiente y uno falla.
- Una BBDD creada con `db:push` ya tiene las tablas pero no tiene diario: `migrate()` intentaría ejecutar `0000` y fallaría con `table ... already exists`.
- SQLite abría en modo `DELETE` (por defecto): un escritor bloquea a los lectores y cualquier contención devuelve `SQLITE_BUSY` al instante.

## Decisión

- `src/lib/db/connection.ts` → `openDatabase(file)`: `journal_mode = WAL`, `busy_timeout = 5000`, `synchronous = NORMAL`, `foreign_keys = ON`. `src/lib/db/index.ts` la usa y exporta `sqlite` además de `db`.
- `src/lib/db/migrate.ts` → `runMigrations(sqlite, folder = <cwd>/drizzle)`:
  - **Baseline:** si existe `users` y el diario no existe o está vacío, registra la **primera** migración como aplicada (mismo `hash` y `created_at` que escribiría Drizzle) sin ejecutarla. No toca ninguna fila.
  - Después, `migrate()` de `drizzle-orm/better-sqlite3/migrator` aplica lo pendiente.
  - Devuelve `{ applied, baselined }`.
- `src/instrumentation.ts` → `register()` llama a `runMigrations` una vez por proceso, solo en runtime `nodejs` y nunca durante `next build` (`NEXT_PHASE === "phase-production-build"`), que carga el hook en varios workers.
- Los tests de integración usan `migratedTestDb()` (`src/test/db.ts`) para tener el esquema real en memoria.
- CI: `pnpm db:generate` + `git status --porcelain drizzle` vacío. drizzle-kit 0.31 no tiene `generate --check`.
- `db:push` queda solo para prototipos con BBDD desechable. Cambios de esquema: `pnpm db:generate` y commitear `drizzle/`.

## Alternativas consideradas

- **`drizzle-kit migrate` antes de `next start`** — obliga a tener drizzle-kit (dependencia de desarrollo) en producción y a acordarse del paso en cada entorno; tampoco resuelve el baseline.
- **Migrar al importar `@/lib/db`** — se ejecuta en cada worker y en cada test que importa `db`: carrera sobre el diario y efectos ocultos en tests.
- **Baseline comparando el esquema completo con el snapshot** — más preciso, pero mucho más código. Mientras solo exista `0000` el criterio "hay `users` y no hay diario" es exacto.

## Consecuencias

- **+** Una instalación nueva no necesita ningún comando de BBDD; las BBDD existentes de `db:push` arrancan sin error y sin perder datos (verificado con test y con una copia de una BBDD real).
- **+** WAL: lecturas concurrentes con una escritura, menos `SQLITE_BUSY`. Aparecen `*.db-wal` y `*.db-shm` junto al archivo (ya ignorados en `.gitignore`); hay que copiarlos juntos o hacer `pragma wal_checkpoint` antes de copiar.
- **−** El baseline asume que una BBDD de `db:push` equivale a `0000`. Una BBDD empujada con un `schema.ts` más nuevo que la última migración commiteada fallará en la migración siguiente con "already exists": hay que recrearla o marcar a mano esa migración. Aplica a quien siga usando `db:push` después de este cambio.
- **−** Con varios procesos Node apuntando a la misma BBDD (no es el caso en v1, ADR 006) seguiría habiendo carrera entre procesos; habría que migrar en un paso de deploy previo.
- **−** La carpeta `drizzle/` debe estar en el directorio de trabajo del servidor (`process.cwd()`); con `output: "standalone"` habría que copiarla.
