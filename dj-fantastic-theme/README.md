# dj-fantastic-theme


A **custom Shopify Online Store 2.0 theme** built with **Liquid**, **JSON templates**, **JavaScript**, and **CSS**.  
This theme is designed for **performance**, **editor-friendly customization**, and **clean component-driven structure**.


---


## Features


- Shopify **OS 2.0** architecture (JSON templates + sections everywhere)
- Modular **section / block** system
- Cart **drawer support**
- Collection + Product optimized layouts
- Editor-safe settings with sensible defaults
- Mobile-first, responsive UI
- Progressive enhancement (JS enhances, not replaces, Liquid)
- Clean separation of structure (Liquid), behavior (JS), and style (CSS)


---


## Directory structure


```txt
dj-fantastic-theme/
├─ assets/                # Compiled CSS, JS, images, fonts
├─ config/
│  ├─ settings_schema.json
│  └─ settings_data.json  # Local/dev only
├─ layout/
│  └─ theme.liquid        # Global layout wrapper
├─ locales/               # i18n strings
├─ sections/              # Page-level & major UI components
├─ snippets/              # Reusable partials (cart, icons, UI)
├─ templates/             # Legacy Liquid templates (minimal)
├─ templates/*.json       # OS 2.0 JSON templates (source of truth)
└─ README.md

Rule of thumb

Page structure lives in JSON templates

UI logic lives in sections

Reuse lives in snippets

Requirements

Shopify Partner account

Development store (Online Store 2.0)

Shopify CLI (latest)

Node.js (LTS recommended)
