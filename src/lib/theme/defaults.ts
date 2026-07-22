export const DEFAULT_HTML_TEMPLATE = `
<div class="listae-profile">
  <section class="listae-profile-header">
    <h1>{{displayName}}</h1>
    <p class="listae-profile-username">@{{username}}</p>
  </section>
  <div class="listae-lists">
    {{lists}}
  </div>
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
