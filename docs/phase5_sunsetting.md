# Phase 5: Sunsetting Python

## Overview
The final evolution of Macadam. With the entire architecture shifted to the client-side using `IndexedDB`, Service Workers, and pure JavaScript modules, the Flask server became obsolete. 

This phase removes Python from the equation completely, finalizing the transformation of Macadam into a static, serverless Progressive Web App.

## Steps Taken

### 1. Template Compilation
The original application relied heavily on Jinja2 (`{% extends 'base.html' %}`) for layout inheritance. 
A temporary build script (`build_static.py`) was utilized to compile the dynamic Jinja templates into flat, standalone HTML files:
- `dashboard.html` -> `index.html`
- `weekly.html` -> `weekly.html`
- `expenses.html` -> `expenses.html`
- `admin.html` -> `settings.html`

During this process, all dynamic Python injections (`{{ current_user.name }}`) and URL routers (`{{ url_for(...) }}`) were permanently stripped or replaced with static relative links.

### 2. Deleting the Backend
The following backend components were completely removed:
- `app.py` & `routes.py`
- `models.py` & `blueprint.py`
- `extensions.py` & `logic.py`
- `requirements.txt` & `.venv`
- `instance/` (SQLite database)

### 3. Service Worker Adjustment
The PWA Engine (`sw.js`) and `manifest.json` were moved to the project root. The `sw.js` cache array was updated to point to the new `.html` endpoints rather than the old Flask route endpoints (e.g., caching `weekly.html` instead of `/weekly`).

## Conclusion & Hosting
Macadam is now **100% Serverless**. 
It is a purely static website.

Because it has no backend dependencies, you can drag and drop this entire folder into any free static hosting provider:
- **GitHub Pages**
- **Vercel**
- **Netlify**
- **Cloudflare Pages**

Once deployed, users can visit the URL, install the app to their device via the PWA prompt, and never need the internet again to track their earnings. Their data is fully self-hosted in their browser vault, safely exportable at any time.
