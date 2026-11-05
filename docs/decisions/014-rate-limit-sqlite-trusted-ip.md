# 014 — Rate limits en SQLite con IP de confianza

**Fecha:** 2026-11-04  
**Estado:** aceptada  
**Relacionada con:** ADR 002 (SQLite + Drizzle), ADR 006 (deploy local-first), ADR 012 (migraciones al arrancar, tabla `rate_limit_windows` de la migración `0001`); auditoría `2026-11-04` (SEC-A2, reabre LISTAE-001/002); plan `docs/superpowers/plans/2026-11-04-audit-remediation.md` (T1.2; decisiones D6, D8, D15)

## Contexto

El limitador de `src/lib/security/rate-limit.ts` (2026-07-29) tenía tres fallos (SEC-A2):

1. **IP falsificable.** Tomaba el último salto de `X-Forwarded-For` o `X-Real-IP` sin saber si había un proxy delante. Sin proxy, el cliente controla esas cabeceras y puede cambiar de «IP» en cada petición. Con varios proxies, el último salto es el CDN y todo el mundo comparte un cubo.
2. **Desalojo FIFO global.** Un único `Map` de 10 000 claves borraba las ventanas más antiguas, aunque siguieran activas. Unas 10 000 búsquedas reiniciaban el límite de magic link de una víctima: bombardeo de emails, SMTP quemado y cuota de TMDB.
3. **Estado en memoria.** Se perdía al reiniciar y cada worker tenía el suyo.

## Decisión

**Almacén: SQLite** (tabla `rate_limit_windows (key PK, count, reset_at)`, índice en `reset_at`). Sin Redis (stack fijo, D15).

- `check` es **una sola sentencia atómica**: `INSERT … ON CONFLICT(key) DO UPDATE … RETURNING count, reset_at`. Si la ventana ha caducado (`reset_at <= now`), vuelve a `count = 1` y a un `reset_at` nuevo. Si no, suma 1 sin alargar la ventana. `ok = count <= limit`. SQLite serializa a los escritores, así que no hay carrera entre workers ni entre peticiones.
- **Sin tope global ni desalojo.** Cada clave (`<categoría>:<sujeto>`) tiene su fila y su límite. Solo se borran las ventanas **caducadas**: `purgeExpired(now)`, que `check` ejecuta como mucho una vez por minuto y por proceso. Llenar una categoría nunca reinicia otra.
- Las claves de más de 128 caracteres se guardan como `sha256:<hex>`.
- **Fail-closed por defecto.** Si el almacén falla (BBDD cerrada, tabla aún sin migrar), `check` devuelve `{ ok: false }` y lo registra con `console.warn`. La búsqueda pide `failOpen: true`: su abuso solo cuesta cuota de proveedor, y no queremos tumbar el buscador. Login y magic link no lo piden.
- API: `createRateLimiter(db)` → `{ check, purgeExpired }` para tests e inyección; `checkRateLimit`, `purgeExpiredRateLimits` y `resetRateLimitsForTests` ligados a la conexión `sqlite` de `@/lib/db`.

**IP del cliente** (`src/lib/security/client-ip.ts`, `clientIpFromHeaders(headers, env)`). Nunca se confía en lo que manda el cliente:

- `CLIENT_IP_HEADER` (**recomendado**, D6: `x-real-ip`): cabecera que el proxy inverso **sobrescribe** con la IP del socket (nginx: `proxy_set_header X-Real-IP $remote_addr;`). Tiene prioridad. Si trae una lista, basura o un puerto, la IP es desconocida.
- `TRUSTED_PROXY_HOPS=N`: número de proxies de confianza que **añaden** a `X-Forwarded-For`. La IP es la entrada N contando desde la derecha. Lo que hay más a la izquierda lo eligió el cliente. Con menos saltos que N, la IP es desconocida.
- Sin ninguna de las dos, o con valores inválidos, la IP es **desconocida** (`null`). En producción se avisa una vez al arrancar (`instrumentation.ts`).
- Solo se aceptan IPs válidas (`net.isIP`). Para las claves, `ipRateLimitBucket` agrupa IPv6 por su prefijo `/64` (un host suele tener un `/64` entero y podría rotar el sufijo) y desenvuelve `::ffff:a.b.c.d`.

**Cuotas y visitantes con IP desconocida** (D8):

| Clave | Límite | Si la IP es desconocida |
|---|---|---|
| `search:ip:<ip>` | 30 / h, fail-open | Cubo compartido `search:unknown-ip`, 300 / h |
| `magic-link:<email normalizado>` (`sendVerificationRequest`) | 5 / h, fail-closed | Igual: no depende de la IP |
| `login:email:<email>` (action del login) | 5 / h, fail-closed | Igual |
| `login:ip:<ip>` (action del login) | 20 / h, fail-closed | No se aplica: un cubo compartido dejaría a cualquiera bloquear el login de todos |

Así, un visitante sin IP conocida no puede saltarse el límite por email (ninguna rama lo omite), ni bloquear el login de los demás (no hay cubo compartido en auth), ni rotar cabeceras para buscar sin límite (comparte un cubo de 300 / h).

## Alternativas consideradas

- **Memoria con un mapa por categoría:** quita el desalojo cruzado, pero se pierde al reiniciar y no se comparte entre workers. Se descarta.
- **Redis / Upstash:** es lo habitual, pero el stack de v1 no permite servicios nuevos (D15). El puerto `createRateLimiter(store)` deja hueco para cambiarlo más adelante.
- **IP del socket:** Next.js no la expone a Server Components ni a Server Actions. Next solo rellena `X-Forwarded-For` con ella si el cliente no lo ha enviado, así que tampoco sirve como fuente de confianza.
- **Tope de filas por categoría:** al llenarse habría que rechazar claves nuevas (bloqueo de todos) o desalojar (el fallo original). Se prefiere no tener tope y purgar las caducadas.
- **Leer y luego escribir en una transacción:** dos sentencias y más código para el mismo resultado que el UPSERT.

## Consecuencias

- Los límites sobreviven a reinicios y se comparten entre workers. Cada comprobación es una escritura en SQLite (WAL, ADR 012). Es despreciable al volumen de v1.
- La tabla crece con las claves distintas de la última ventana (como mucho una hora). Con IPs de confianza, para crecer hace falta tener muchas IPs o muchos emails. `purgeExpired` la mantiene acotada.
- **Configuración obligatoria en producción:** sin `CLIENT_IP_HEADER` o `TRUSTED_PROXY_HOPS`, todas las búsquedas anónimas comparten 300 / h y el login solo se limita por email. Activar `CLIENT_IP_HEADER` **sin** un proxy que la sobrescriba vuelve a dejar que el cliente elija su IP: es responsabilidad del despliegue.
- Si SQLite falla, no se puede pedir magic link (fail-closed). La búsqueda sigue funcionando sin límite.
- Los intentos bloqueados también suman en `count`, pero no alargan la ventana.
- Rollback: revertir el PR. La tabla de la migración `0001` puede quedarse.

## Adenda (2026-11-05): cuotas del catálogo por usuario (T1.6, SEC-M2, FUN-P1-4)

Las cuotas del catálogo se aplican **por usuario autenticado**, nunca por IP (D8):

| Qué | Límite | Mecanismo |
|---|---|---|
| Imports (`importHitAction`) | 60 / h por usuario | `checkRateLimit("import:user:<userId>")`, fail-closed. Al superarlo, `FormInputError("rateLimited")` con `{minutes}` hasta que se libere la ventana |
| Obras manuales por día | 20 / 24 h por usuario | `count(*)` sobre `works` (`created_by`, `created_at`, índice `works_created_by_idx`). Error `manualQuotaExceeded` con `{max, hours}` (horas hasta que caduque la obra más antigua de la ventana) |
| Obras manuales en total | 500 por usuario | Mismo recuento sin ventana. Error `manualTotalQuotaExceeded` con `{max}` |

- Las obras manuales no usan `rate_limit_windows`: el recuento sobre `works` ya es persistente, compartido entre workers y exacto (una ventana fija permitiría ráfagas de 2×20 en el cambio de ventana).
- `createManualWork` rellena `works.created_by` y reutiliza (`reused: true`) la obra manual del mismo usuario con igual tipo, `lower(trim(title))` y año, sin consumir cuota.
- Límites de longitud en servidor: título ≤ 300, título original ≤ 300, sinopsis ≤ 5 000, URL de portada ≤ 500 (https). Los `maxLength` del formulario solo son ayuda de UI.
