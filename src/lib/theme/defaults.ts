export const DEFAULT_HTML_TEMPLATE = `
<div class="listae-profile">
  <section class="listae-profile-header">
    <h1>{{displayName}}</h1>
    <p class="listae-profile-username">@{{username}}</p>
  </section>
  <section class="listae-domain-block">
    <h2 class="listae-domain-heading">Audiovisual</h2>
    {{audiovisual_lists}}
  </section>
  <section class="listae-domain-block">
    <h2 class="listae-domain-heading">Reading</h2>
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
  --listae-domain-accent: #6b7ae8;
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
.listae-entry-type,
.listae-entry-score,
.listae-entry-progress,
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

.listae-domain--audiovisual .listae-entry,
.listae-domain--reading .listae-entry {
  border-color: color-mix(in srgb, var(--listae-domain-accent) 28%, #374151);
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

.listae-status-entries {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.listae-entry {
  display: grid;
  grid-template-columns: 5rem 1fr;
  gap: 1rem;
  min-height: 7rem;
  padding: 1rem;
  border: 1px solid #374151;
  border-radius: 0.75rem;
  background: #1f2937;
}

.listae-entry-cover {
  width: 5rem;
  height: 7rem;
  border-radius: 0.4rem;
  object-fit: cover;
}

.listae-entry-details {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.35rem;
}

.listae-entry-title {
  overflow: hidden;
  color: #f9fafb;
  font-weight: 700;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.listae-entry-title:hover {
  color: #93c5fd;
}

.listae-entry-type {
  text-transform: capitalize;
}
`.trim();
