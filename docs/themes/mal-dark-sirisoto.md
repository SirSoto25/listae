# MAL-like dark navy profile theme

Ready-to-paste HTML and CSS for a MyAnimeList-inspired layout using granular `{{audiovisual_*}}` placeholders. Replace the aside image URL with your own HTTPS cover or avatar.

## HTML template

Paste into the theme editor **HTML** field:

```html
<div class="mal-profile">
  <header class="mal-topbar">
    <div class="mal-topbar-inner">
      <h1 class="mal-display-name">{{displayName}}</h1>
      <p class="mal-username">@{{username}}</p>
    </div>
  </header>
  <div class="mal-layout">
    <aside class="mal-aside">
      <img
        class="mal-aside-img"
        src="https://via.placeholder.com/400x800"
        alt=""
      />
    </aside>
    <main class="mal-main">
      <section class="mal-section">
        <h2 class="mal-section-title">Watching</h2>
        {{audiovisual_in_progress}}
      </section>
      <section class="mal-section">
        <h2 class="mal-section-title">Plan to Watch</h2>
        {{audiovisual_plan}}
      </section>
      <section class="mal-section">
        <h2 class="mal-section-title">Completed</h2>
        {{audiovisual_completed}}
      </section>
      <section class="mal-section">
        <h2 class="mal-section-title">On Hold</h2>
        {{audiovisual_on_hold}}
      </section>
      <section class="mal-section">
        <h2 class="mal-section-title">Dropped</h2>
        {{audiovisual_dropped}}
      </section>
    </main>
  </div>
</div>
```

> **Aside image:** swap `https://via.placeholder.com/400x800` for any HTTPS image URL (profile photo, banner crop, etc.).

## CSS

Paste into the theme editor **CSS** field. Uses a system font stack (no Google Fonts `@import`).

```css
:root {
  color-scheme: dark;
  --mal-bg: #0f1419;
  --mal-panel: #1c2333;
  --mal-border: #2e3748;
  --mal-accent: #2e51a2;
  --mal-accent-hover: #4a6fd4;
  --mal-text: #e8eef9;
  --mal-muted: #8b9cb3;
  font-family: system-ui, -apple-system, "Segoe UI", Inter, sans-serif;
  background: var(--mal-bg);
  color: var(--mal-text);
}

body {
  margin: 0;
}

.mal-profile {
  min-height: 100vh;
}

.mal-topbar {
  background: linear-gradient(180deg, #1a2744 0%, var(--mal-bg) 100%);
  border-bottom: 1px solid var(--mal-border);
  padding: 1.25rem 1.5rem;
}

.mal-topbar-inner {
  max-width: 72rem;
  margin: 0 auto;
}

.mal-display-name {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.mal-username {
  margin: 0.25rem 0 0;
  color: var(--mal-muted);
  font-size: 0.875rem;
}

.mal-layout {
  display: grid;
  grid-template-columns: 12rem 1fr;
  gap: 1.5rem;
  max-width: 72rem;
  margin: 0 auto;
  padding: 1.5rem;
}

@media (max-width: 640px) {
  .mal-layout {
    grid-template-columns: 1fr;
  }

  .mal-aside {
    max-width: 10rem;
  }
}

.mal-aside-img {
  display: block;
  width: 100%;
  border-radius: 0.25rem;
  border: 1px solid var(--mal-border);
  object-fit: cover;
}

.mal-section {
  margin-bottom: 2rem;
}

.mal-section-title {
  margin: 0 0 0.5rem;
  padding-bottom: 0.35rem;
  border-bottom: 2px solid var(--mal-accent);
  font-size: 1rem;
  font-weight: 600;
  color: var(--mal-accent);
}

/* Hide duplicate status headings from placeholder sections */
.mal-section .listae-status-title {
  display: none;
}

.mal-section .listae-status {
  margin-top: 0;
}

.mal-section .listae-status-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.mal-section .listae-status-table th {
  padding: 0.35rem 0.5rem;
  border-bottom: 1px solid var(--mal-border);
  color: var(--mal-muted);
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  text-align: left;
}

.mal-section .listae-status-table td {
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid var(--mal-border);
  vertical-align: middle;
}

.mal-section .listae-entry:nth-child(even) {
  background: color-mix(in srgb, var(--mal-panel) 60%, transparent);
}

.mal-section .listae-entry-cover {
  width: 2.25rem;
  height: 3.25rem;
  border-radius: 0.15rem;
  object-fit: cover;
}

.mal-section .listae-entry-title {
  color: var(--mal-text);
  font-weight: 600;
  text-decoration: none;
}

.mal-section .listae-entry-title:hover {
  color: var(--mal-accent-hover);
}

.mal-section .listae-col-index {
  width: 2rem;
  text-align: center;
  color: var(--mal-muted);
}

.mal-section .listae-col-cover {
  width: 3rem;
}

.mal-section .listae-col-score,
.mal-section .listae-col-type,
.mal-section .listae-col-progress {
  color: var(--mal-muted);
}

.mal-section .listae-col-type {
  text-transform: capitalize;
}
```

## Notes

- Granular placeholders render **only** when entries exist; empty sections stay blank (no “No entries yet” paragraph).
- For a reading-focused layout, swap `audiovisual_*` placeholders for `reading_*`.
- To style both domains in one theme, use `{{audiovisual_lists}}` / `{{reading_lists}}` instead and keep the default `.listae-domain--*` wrappers.
