# 015 — Sanitizar el documento final del perfil; placeholders solo en texto

**Fecha:** 2026-11-04  
**Estado:** aceptada  
**Relacionada con:** enmienda ADR 005 (perfil HTML + CSS); ADR 013 (CSP del perfil); auditoría `2026-11-04` (SEC-M1, SEC-B5); plan `docs/superpowers/plans/2026-11-04-audit-remediation.md` (T1.5, discrepancia nº 8)

## Contexto

- El pipeline sanitizaba la plantilla **cruda** y sustituía los placeholders **después**. Un `{{placeholder}}` dentro de un atributo esquivaba el sanitizador: `href="java{{reading_lists}}script:alert(1)"` no tiene un esquema válido (lleva `{`), sanitize-html lo trata como URL relativa y lo deja pasar. Si el placeholder sale vacío queda `javascript:alert(1)`; igual con `ht{{x}}tp://` (baja a `http:`) y `da{{x}}ta:`.
- El perfil público usa `sandbox="allow-top-navigation-by-user-activation"` y `<base target="_top">`: un clic en ese enlace navega la pestaña superior. El sandbox sin `allow-scripts` y la CSP (ADR 013) impiden ejecutar el JS, pero el esquema arbitrario y la bajada a `http:` siguen siendo un problema.
- Con un placeholder no vacío, el HTML generado (con comillas) rompía el atributo.
- El allowlist no incluía los `data-*` que genera Listae (`data-status`, `data-domain`, `data-type`, `data-index`): sanitizar el resultado final los habría borrado y roto el CSS de los usuarios.

## Decisión

- **Orden del pipeline en cada render** (`renderTheme`, perfil público y vista previa del editor): (1) longitud de la plantilla y `validateThemeCss`; (2) `renderProfileHtml` sobre la plantilla tal cual; (3) `sanitizeThemeHtml` sobre el **HTML final**.
- **`sanitizeThemeHtml`** (`src/lib/theme/sanitize-html.ts`):
  - `data-status` y `data-domain` en `section`; `data-type` y `data-index` en `tr`. En el resto de etiquetas se siguen borrando.
  - Post-filtro de `a[href]` e `img[src]` sobre el valor decodificado y normalizado como lo haría el navegador (sin tabuladores ni saltos de línea; recortado): solo `https:` con host, o rutas `/…` que no cambian de origen (se rechazan `//…` y `/\…`). El resto de URLs (`http:`, `data:`, `mailto:`, relativas sin `/`, `#ancla`) se quitan.
  - `a` siempre lleva `rel="noopener noreferrer"`; `img` siempre lleva `referrerpolicy="no-referrer"` (SEC-B5: las portadas e imágenes externas no reciben la URL del perfil).
- **Al guardar** (`prepareThemeForSave`): si la plantilla, pasada por el mismo allowlist sin el post-filtro de URLs, tiene `{{` dentro de una etiqueta (`findPlaceholderInMarkup`), se rechaza con `placeholderInAttribute` y la línea/columna del primer `{{` en un atributo. Los placeholders solo se admiten en el texto.
- **Plantillas antiguas** con placeholders en atributos **no se rechazan al pintar**: el sanitizado final las neutraliza. Solo dan error cuando el usuario vuelve a guardar.

## Alternativas consideradas

- **Rechazar al pintar las plantillas con placeholders en atributos:** el perfil caería a la plantilla por defecto sin aviso al visitante. Se descarta.
- **Escapar los valores según el contexto (texto vs. atributo):** los placeholders de listas insertan HTML, que no tiene sentido dentro de un atributo. Se descarta.
- **Sanitizar solo al guardar y validar los atributos con una regex:** no cubre plantillas ya guardadas ni el HTML generado. Se descarta.

## Consecuencias

- El documento que llega al `srcdoc` siempre ha pasado por el sanitizador, también lo que genera Listae.
- **Coste:** sanitizar en cada render es más caro. Medido en local con la plantilla por defecto (Vitest, Node 22): 30 entradas, de 0,36 ms a 1,8 ms por render; 1500 entradas (~700 KB de HTML), de 9 ms a 62 ms. La caché del render llega en T2.6.
- El perfil por defecto y `docs/themes/mal-dark-sirisoto.md` producen el mismo DOM que antes, más `rel` e `referrerpolicy` (test `final sanitize only adds rel/referrerpolicy…` en `render.test.ts`).
- Los enlaces `#ancla` de las plantillas desaparecen. Con `<base href="/" target="_top">` ya llevaban a la home de Listae, no a la ancla.
- Un `rel` o `referrerpolicy` escrito por el usuario se sustituye.
