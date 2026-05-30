# Dragon Gate · 龙门

A single-page marketing and reservation website for a fictional Michelin-tier modern Cantonese restaurant, **Dragon Gate · 龙门**. Built as a pure static front-end — **vanilla HTML, CSS, and JavaScript only**, with no frameworks, build step, or dependencies.

🔗 **Live site:** https://alfredang.github.io/restaurantbooking/

![Dragon Gate screenshot](screenshot-dragongate.png)

## Features

- **Responsive single-page layout** — hero, menu (Dim Sum / Mains / Desserts & Tea), testimonials, reservation form, contact/lead section, and footer.
- **Bilingual brand & typography** — English display serif (Cormorant Garamond) paired with Noto Serif SC for first-class Hanzi rendering.
- **Lacquer-red + gold design system** — imperial palette with hairline gold rules and a seal/chop motif.
- **Client-side reservation form** with per-field validation and an inline confirmation message (no backend).
- **Fade-in-on-scroll** animations via `IntersectionObserver`, with a graceful fallback.
- **Mobile navigation** with an accessible toggle (`aria-expanded`).
- **Accessibility first** — descriptive `alt` text, labelled inputs, `role="alert"` errors.
- **Reduced-motion support** — animations and smooth scroll are disabled for users who prefer reduced motion.
- **Floating concierge chatbot** — fixed bottom-right bubble that opens a chat panel. Answers guest questions via **RAG** over `FAQ.md`, served by a local FastAPI + ChromaDB backend with HuggingFace embeddings.
- **Contact / lead section** with embedded Google Map showing the restaurant location.

## Project structure

| File | Responsibility |
|------|----------------|
| `index.html` | All content and section markup (`#hero`, `#menu`, `#testimonials`, `#reservations`, footer). |
| `styles.css` | All styling. Design tokens (palette, fonts, spacing) live in CSS custom properties under `:root`. |
| `script.js` | All behavior — one IIFE with init modules: mobile nav, scroll fade-in, date constraint, reservation form, lead form, theme toggle, chatbot widget. |
| `FAQ.md` | Source knowledge base for the concierge chatbot (Q&A grouped by section). |
| `backend/` | Python RAG backend — `ingest_faq.py` (FAQ → ChromaDB), `server.py` (FastAPI `/query`), `requirements.txt`. |

## Running locally

There is nothing to build or compile. Either:

- Open `index.html` directly in a browser, or
- On Windows: `Start-Process index.html`, or
- Serve over HTTP: `python -m http.server 8000` and visit http://localhost:8000

A network connection is needed for Google Fonts and Unsplash dish photos to load.

### Running the chatbot backend (optional)

The concierge chatbot calls a local FastAPI server. Without it the bubble still opens but queries will fail.

```bash
cd backend
pip install -r requirements.txt

# Add your HuggingFace token to .env at the project root:
#   HF_API_KEY=hf_xxxxxxxxxxxxxxxxxxxx
# Get one (Read scope) at https://huggingface.co/settings/tokens

python ingest_faq.py             # parses FAQ.md → ChromaDB at ./chroma_store/
uvicorn server:app --port 8000   # API at http://127.0.0.1:8000 (landing + /docs)
```

The frontend hits `http://127.0.0.1:8000/query` by default. Override by setting `window.CHATBOT_API_URL` before `script.js` loads.

## Deployment

The site auto-deploys to **GitHub Pages** on every push to `main` via GitHub Actions
([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)). The workflow can also be
triggered manually from the **Actions** tab (workflow_dispatch).

## Tech stack

- HTML5
- CSS3 (custom properties, BEM-style class naming)
- Vanilla JavaScript (ES, no dependencies)
- Google Fonts (Cormorant Garamond + Noto Serif SC + Inter) + Unsplash images
- **Chatbot backend (optional):** Python · FastAPI · ChromaDB · HuggingFace Inference API (`sentence-transformers/all-MiniLM-L6-v2`)
