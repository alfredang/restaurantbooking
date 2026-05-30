# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page marketing + reservation site for a fictional upscale French restaurant, **Maison Lumière**. Pure static front-end — **vanilla HTML/CSS/JS only**, no frameworks, no build step, no package manager, no tests.

## Running

There is nothing to build or compile. Open `index.html` directly in a browser, or on Windows: `Start-Process index.html`. All assets are either local (`styles.css`, `script.js`) or remote (Google Fonts + Unsplash images), so a network connection is needed for fonts and dish photos to load.

## Structure

Three files, one responsibility each:
- `index.html` — all content and section markup (`#hero`, `#menu`, `#testimonials`, `#reservations`, footer).
- `styles.css` — all styling.
- `script.js` — all behavior.

## Architecture notes

**Design system lives in CSS custom properties** at the top of `styles.css` (`:root`): the brand palette (`--charcoal`, `--ivory`, `--gold`), fonts, `--maxw`, and `--nav-h`. Change colors/spacing there, not inline. `--nav-h` is also consumed by `scroll-padding-top` so anchor links land below the sticky header — keep them in sync.

**BEM-style class naming** throughout (`.dish__media`, `.nav__links`, `.form__field`). Follow it when adding markup.

**`script.js` is one IIFE** with an init dispatcher on `DOMContentLoaded` calling four independent modules: `initMobileNav`, `initScrollFadeIn`, `initDateConstraint`, `initReservationForm`. Add new behavior as another `init*` function wired into the dispatcher.

**Reservation form is entirely client-side** (no backend). `initReservationForm` holds a `validators` map (field name → function returning an error string or `""`); per-field errors render into `#error-<fieldname>` spans and toggle `aria-invalid`. To add/change a field, update both the HTML field (with its matching `#error-*` span) and the `validators` map. On success the form is hidden and `#confirmation` is shown — there is no network call.

**Fade-in-on-scroll**: any element with class `fade-in` is observed by an IntersectionObserver that adds `.visible`. There's a no-IntersectionObserver fallback that reveals everything immediately. Section reveals depend on this — a section without `fade-in` simply stays visible.

## Conventions worth preserving

- **Accessibility is load-bearing, not decorative**: every `<img>` has descriptive `alt`, every input has a `<label>`, errors use `role="alert"`, the nav toggle maintains `aria-expanded`. Maintain this when editing.
- **Reduced motion**: a `@media (prefers-reduced-motion: reduce)` block disables animations and smooth scroll — don't reintroduce unconditional motion.
- **Unsplash dish photos** must visually match the dish they label. When swapping an image, verify the URL resolves (HTTP 200) **and** that the photo actually depicts that dish — past image IDs were wrong despite resolving. Use the `?w=800&q=80&auto=format&fit=crop` query params for consistency.
