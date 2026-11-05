export const DEFAULT_HTML_TEMPLATE = `
<div class="listae-profile">
  <section class="listae-profile-header">
    <h1>{{displayName}}</h1>
    <p class="listae-profile-username">@{{username}}</p>
  </section>
  <section class="listae-domain-block">
    <h2 class="listae-domain-heading">{{audiovisual_heading}}</h2>
    {{audiovisual_lists}}
  </section>
  <section class="listae-domain-block">
    <h2 class="listae-domain-heading">{{reading_heading}}</h2>
    {{reading_lists}}
  </section>
</div>
`.trim();

export const DEFAULT_CSS = `
:root {
  color-scheme: dark;
  font-family: system-ui, sans-serif;
  background: #111827;
  color: #f9fafb;
}

body {
  margin: 0;
}

/* listae:domain-vars:start */
.listae-domain--audiovisual {
  --listae-domain-bg: #1a2238;
  --listae-domain-accent: #8e9bf5;
  --listae-domain-fg: #e8eef9;
}

.listae-domain--reading {
  --listae-domain-bg: #1c222c;
  --listae-domain-accent: #7a8a9a;
  --listae-domain-fg: #e8eef0;
}
/* listae:domain-vars:end */

.listae-profile {
  width: min(72rem, calc(100% - 2rem));
  margin: 0 auto;
  padding: 3rem 0;
}

.listae-profile-header {
  margin-bottom: 2.5rem;
}

.listae-profile-header h1,
.listae-status-title {
  margin: 0;
}

.listae-profile-username,
.listae-col-type,
.listae-col-score,
.listae-col-progress,
.listae-status-empty {
  color: #9ca3af;
}

.listae-domain-block {
  margin-top: 2.5rem;
}

.listae-domain-heading {
  margin: 0 0 1rem;
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.listae-domain--audiovisual,
.listae-domain--reading {
  margin-top: 1rem;
  padding: 1.25rem;
  border-radius: 0.75rem;
  background: var(--listae-domain-bg);
  color: var(--listae-domain-fg);
  border: 1px solid color-mix(in srgb, var(--listae-domain-accent) 35%, transparent);
}

.listae-domain--audiovisual .listae-status-title,
.listae-domain--reading .listae-status-title {
  color: var(--listae-domain-accent);
}

.listae-domain--audiovisual .listae-status-table td,
.listae-domain--reading .listae-status-table td {
  border-bottom-color: color-mix(in srgb, var(--listae-domain-accent) 28%, #374151);
}

.listae-domain--audiovisual .listae-entry:nth-child(even),
.listae-domain--reading .listae-entry:nth-child(even) {
  background: color-mix(in srgb, var(--listae-domain-bg) 70%, #111827);
}

.listae-domain--audiovisual .listae-entry-title,
.listae-domain--reading .listae-entry-title {
  color: var(--listae-domain-fg);
}

.listae-domain--audiovisual .listae-entry-title:hover,
.listae-domain--reading .listae-entry-title:hover {
  color: var(--listae-domain-accent);
}

.listae-status {
  margin-top: 2rem;
}

/* An h3 inside a domain block, an h2 in {{lists}}: same look for both. */
.listae-status-title {
  font-size: 1.125rem;
}

.listae-status-table {
  width: 100%;
  margin-top: 1rem;
  border-collapse: collapse;
  table-layout: auto;
}

.listae-status-table th,
.listae-status-table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #374151;
  text-align: left;
  vertical-align: middle;
}

.listae-status-table th {
  color: #9ca3af;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.listae-col-index {
  width: 2.5rem;
  text-align: center;
}

.listae-col-cover {
  width: 3.5rem;
}

.listae-col-score,
.listae-col-type {
  width: 6rem;
}

.listae-col-progress {
  width: 8rem;
}

.listae-entry-cover {
  display: block;
  width: 2.5rem;
  height: 3.5rem;
  border-radius: 0.25rem;
  object-fit: cover;
}

.listae-entry-title {
  display: block;
  color: #f9fafb;
  font-weight: 700;
  text-decoration: none;
  white-space: normal;
  overflow-wrap: anywhere;
}

.listae-entry-title:hover {
  color: #93c5fd;
}

.listae-col-type {
  text-transform: capitalize;
}

/* Text for screen readers only (the cover column header). */
.listae-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 40rem) {
  .listae-col-index,
  .listae-col-cover,
  .listae-col-type {
    display: none;
  }

  .listae-col-score,
  .listae-col-progress {
    width: auto;
  }

  /* Keeps short titles whole: wrapping anywhere would shrink them to a letter. */
  .listae-col-title {
    min-width: 5.75rem;
  }

  .listae-profile {
    width: calc(100% - 1.5rem);
    padding: 1.5rem 0;
  }

  .listae-domain--audiovisual,
  .listae-domain--reading {
    padding: 0.75rem;
  }

  .listae-status-table th,
  .listae-status-table td {
    padding: 0.5rem 0.375rem;
  }
}
`.trim();
