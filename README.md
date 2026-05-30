# Maison Lumière

A single-page marketing and reservation website for a fictional upscale French restaurant, **Maison Lumière**. Built as a pure static front-end — **vanilla HTML, CSS, and JavaScript only**, with no frameworks, build step, or dependencies.

🔗 **Live site:** https://alfredang.github.io/restaurantbooking/

## Features

- **Responsive single-page layout** — hero, menu, testimonials, reservation form, and footer.
- **Client-side reservation form** with per-field validation and an inline confirmation message (no backend).
- **Fade-in-on-scroll** animations via `IntersectionObserver`, with a graceful fallback.
- **Mobile navigation** with an accessible toggle (`aria-expanded`).
- **Accessibility first** — descriptive `alt` text, labelled inputs, `role="alert"` errors.
- **Reduced-motion support** — animations and smooth scroll are disabled for users who prefer reduced motion.

## Project structure

| File | Responsibility |
|------|----------------|
| `index.html` | All content and section markup (`#hero`, `#menu`, `#testimonials`, `#reservations`, footer). |
| `styles.css` | All styling. Design tokens (palette, fonts, spacing) live in CSS custom properties under `:root`. |
| `script.js` | All behavior — one IIFE with init modules: mobile nav, scroll fade-in, date constraint, reservation form. |

## Running locally

There is nothing to build or compile. Either:

- Open `index.html` directly in a browser, or
- On Windows: `Start-Process index.html`

A network connection is needed for Google Fonts and Unsplash dish photos to load.

## Deployment

The site auto-deploys to **GitHub Pages** on every push to `main` via GitHub Actions
([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)). The workflow can also be
triggered manually from the **Actions** tab (workflow_dispatch).

## Tech stack

- HTML5
- CSS3 (custom properties, BEM-style class naming)
- Vanilla JavaScript (ES, no dependencies)
- Google Fonts + Unsplash images (remote assets)
