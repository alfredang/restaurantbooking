---
description: Push code to GitHub, sync README and repo About, and scan for leaked secrets
---

You are updating the GitHub repository for this project. Work through the steps below in order, using the `gh` CLI (already authenticated) and git. Report what you did at the end.

## 0. Preflight

- Confirm you're in a git repo and on a branch: `git status -sb`.
- Confirm `gh` is authenticated: `gh auth status`. If not, stop and tell the user to run `gh auth login`.
- Determine the remote and repo slug: `gh repo view --json nameWithOwner,visibility,description,url`. If there is no remote yet, ask the user whether to `gh repo create` (and whether public or private).

## 1. Secret / API-key scan (DO THIS BEFORE PUSHING)

Never push secrets to a public repo. Scan the working tree and the staged/committed content:

- Check for a `.gitignore` covering common secret files (`.env`, `.env.*`, `*.pem`, `*.key`, credentials, `node_modules`). Offer to add entries if missing.
- Grep the tracked files for likely secrets, e.g.:
  - API keys / tokens: `sk-`, `ghp_`, `gho_`, `AKIA` (AWS), `AIza` (Google), `xoxb-`/`xoxp-` (Slack), `-----BEGIN ... PRIVATE KEY-----`
  - **Passwords**: `password`, `passwd`, `pwd`, `pass` followed by `=`/`:` and a value; also `password` embedded in connection strings/URLs (e.g. `://user:pass@host`), and hard-coded DB/SMTP/admin credentials.
  - Generic assignments: `api[_-]?key`, `secret`, `token`, `bearer`, `credential` with a value
  - Use Grep across the repo (case-insensitive) and review each hit.
- Also check that no `.env`-style or credential files are tracked: `git ls-files | Select-String -Pattern '\.env|\.pem$|\.key$|credentials|secret'`.

If anything looks like a real secret:
- **STOP. Do not push.** Report exactly what was found and where, and ask the user how to proceed (e.g. remove the file, untrack it, rotate the key, scrub history). Do not continue to step 2 until resolved.

If clean, say so explicitly and continue.

## 2. Push all code to GitHub

- Stage and commit any uncommitted changes (only if there are changes). Use a clear commit message; end it with the Co-Authored-By trailer.
- Push the current branch to its upstream: `git push` (set upstream with `-u origin <branch>` if needed).
- Confirm the push succeeded.

## 3. Create / update the README

- If `README.md` exists, review it and update it so it accurately reflects the current project (purpose, structure, how to run). For this project, keep it aligned with `CLAUDE.md`.
- If it does not exist, create a concise, accurate `README.md`.
- Commit and push the README change if anything changed.

## 4. Publish GitHub Pages via GitHub Actions

Deploy the static site to GitHub Pages using an Actions workflow (not the legacy branch-based Pages).

- Ensure a workflow exists at `.github/workflows/deploy.yml` that builds nothing (this is a static site) and deploys the repo root to Pages. If one already exists, verify it uses the official Pages actions and the `pages` environment. A minimal working workflow:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .
      - id: deployment
        uses: actions/deploy-pages@v4
```

- Enable Pages with the Actions source via the API (idempotent):
  `gh api -X POST repos/<owner/repo>/pages -f build_type=workflow` (if it already exists, use `-X PUT`). Confirm with `gh api repos/<owner/repo>/pages`.
- Commit and push the workflow, then watch the run: `gh run watch` (or `gh run list --workflow=deploy.yml`). Confirm the deploy job succeeds.
- Get the live URL: `gh api repos/<owner/repo>/pages --jq .html_url`.

## 5. Resolve all 404 issues

Once the site is live, verify nothing 404s:

- Fetch the deployed site and check the main page returns HTTP 200.
- Extract every local asset/link from the HTML (CSS, JS, images, favicon, internal hrefs) and verify each resolves with HTTP 200 — watch for **case-sensitivity** (GitHub Pages is case-sensitive; `Styles.css` ≠ `styles.css`) and for paths that work locally but break under the repo subpath (e.g. leading-slash absolute paths like `/styles.css` break on `user.github.io/repo/`). Use relative paths.
- Common 404 causes to fix: missing `favicon.ico`, references to files not committed, wrong case, absolute paths, broken anchor targets (`#section` with no matching `id`).
- For each 404 found: fix the reference (or add the missing file), then re-commit, re-push, wait for the Pages redeploy, and re-verify until the site is 404-clean.

## 6. Create / update the GitHub repo "About"

Set the repository description (and homepage/topics if useful) to match the project:

- Description: a one-line summary of what the project is.
- Homepage: set it to the live GitHub Pages URL from step 4.
- Optionally add a few relevant topics.

Use:
```
gh repo edit <owner/repo> --description "<one-line summary>" --homepage "<pages-url>" [--add-topic <topic>]
```

## 7. Refresh `screenshot.png` if the site changed

The README embeds `screenshot.png`. Keep it in sync with the live site.

- **Detect a visual change.** Treat the screenshot as stale if **any** of these
  are true:
  - This run touched `index.html`, `styles.css`, or any file under an `assets/`
    or `images/` folder (check `git diff --name-only HEAD~1..HEAD` for the
    commits this `/updategit` run created).
  - `screenshot.png` does not exist.
  - `screenshot.png` is older than `index.html` / `styles.css`
    (`git log -1 --format=%ct -- screenshot.png` vs. the same for the site files).
  - The user explicitly asked to refresh it.

  If none of the above are true, skip this step and say "screenshot up to date."

- **Capture a new screenshot** of the deployed Pages URL using the Playwright
  MCP server (already configured in `.mcp.json`):
  1. `mcp__playwright__browser_navigate` to the live Pages URL from step 4.
  2. `mcp__playwright__browser_resize` to `1440 × 900` for a consistent hero crop.
  3. `mcp__playwright__browser_wait_for` ~2s so fonts and Unsplash images settle.
  4. `mcp__playwright__browser_take_screenshot` with `filename: "screenshot.png"`
     and `fullPage: false` — saves into `.playwright-mcp/` by default. Move it
     to the repo root as `screenshot.png` (overwriting the old one).
  - Fallback if Playwright MCP is unavailable: tell the user and skip — do not
     fabricate an image.

- **Commit and push** the new `screenshot.png` with a message like
  `Refresh site screenshot`. Confirm it renders on GitHub by fetching
  `https://github.com/<owner/repo>/raw/main/screenshot.png` and checking HTTP 200.

## 8. Report

Summarize: branch pushed, commit(s) made, README status, Pages deploy status + live URL, any 404s found and how they were fixed, About/description set, and the result of the secret scan (clean, or what was flagged — including any passwords detected).
