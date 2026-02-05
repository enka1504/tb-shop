# tb-shop


Monorepo for a Shopify store build that includes:
- a Shopify **theme** (`dj-fantastic-theme`)
- a Shopify **app** (`dj-fantastic-app`)
- an **admin** surface / utilities (`admin`)
- a packaged theme export (`dj-fantastic-theme.zip`)


Repo is primarily **Liquid**, with **JavaScript** and **CSS**. :contentReference[oaicite:0]{index=0}


---


## Repository layout


```txt
.
├─ admin/                  # Admin tooling / scripts (shop management utilities)
├─ dj-fantastic-app/        # Shopify app (embedded app / extensions / server)
├─ dj-fantastic-theme/      # Shopify theme source (Liquid/JS/CSS/assets)
├─ dj-fantastic-theme.zip   # Theme export artifact
└─ README.md

Note: Keep the ZIP as a build artifact; treat dj-fantastic-theme/ as the source of truth.

Prerequisites

Node.js (LTS recommended)

Git

Shopify CLI (for theme/app dev)

A Shopify Partner account + development store

Quick start
1) Clone
git clone https://github.com/enka1504/tb-shop.git
cd tb-shop
2) Theme development (recommended workflow)

From the theme directory:

cd dj-fantastic-theme
shopify theme dev

Common theme commands:

shopify theme dev             # run local preview
shopify theme pull            # pull live theme into local
shopify theme push            # push local changes to store
shopify theme check           # theme linting (if configured)

If you use multiple stores/themes, set an explicit store:

shopify theme dev --store your-store.myshopify.com
3) App development (if applicable)

From the app directory:

cd ../dj-fantastic-app
npm install
npm run dev

If this is a Shopify CLI-generated app, you’ll typically use:

shopify app dev
Environment variables

Create local environment files as needed:

dj-fantastic-app/.env (or .env.local)

admin/.env (if admin tooling uses secrets)

Typical values you may need (depends on implementation):

SHOPIFY_API_KEY

SHOPIFY_API_SECRET

SCOPES

SHOP

DATABASE_URL

Never commit secrets. Use .env* entries in .gitignore.

Build & release
Theme ZIP

If you keep dj-fantastic-theme.zip in the repo:

Update it only from the current dj-fantastic-theme/ source

Do not manually edit ZIP contents

Prefer a scripted export step (example):

cd dj-fantastic-theme
shopify theme package

(If theme package isn’t used in your CLI version, zip the folder via a script and ensure node_modules is excluded.)

Style guide (Liquid / Theme / Frontend)

This repo is theme-heavy, so consistency matters more than cleverness.

1) Liquid conventions

File organization

sections/ for page-level or major components

snippets/ for reusable partials

templates/ minimal logic; delegate to sections/snippets

Keep logic close to where it renders, but avoid duplicating logic across templates.

Naming

CSS classes: kebab-case (BEM acceptable)

Snippets: component-name.liquid (kebab-case)

Variables: snake_case in Liquid:

{% assign product_handle = product.handle %}

Whitespace & readability

Prefer {% liquid %} blocks for multiple assigns/conditions:

{% liquid
  assign has_media = product.media.size > 0
  assign show_badge = product.available == false
%}

Avoid deep nesting; extract into snippets when conditions grow.

Do

Guard against blank / empty values:

{% if product.metafields.custom.badge != blank %}
  ...
{% endif %}

Use default filter for safe fallbacks:

{{ section.settings.title | default: 'Featured' }}

Don’t

Don’t perform heavy loops in multiple places; compute once and pass via snippet params.

Don’t mix presentation with complex business rules—prefer computed flags.

2) Theme JSON / schema conventions

Section schema

Group settings logically: content → layout → style → advanced

Use consistent IDs:

title, subtitle, description

padding_top, padding_bottom

bg_color, text_color, accent_color

Keep defaults sensible and non-breaking.

Blocks

Prefer blocks for repeatable UI (slides, cards, icons)

Provide a max limit where performance matters:

{ "type": "text", "name": "Item", "limit": 12 }
3) JavaScript conventions (theme)

Goals

Progressive enhancement first (site works without JS where possible)

No global pollution: scope your modules/classes

Use event delegation for dynamic content (cart drawer, quick add, etc.)

Patterns

Use data-* hooks instead of class hooks:

<button data-cart-add>...</button>

Keep selectors centralized per component.

Error handling

Network calls must handle:

non-200 responses

JSON parse failures

empty cart states

4) CSS conventions

Use a consistent methodology (BEM or utility-first—pick one and stick to it)

Component styles live near their section/snippet (if your build allows), otherwise keep a clear index:

base/, components/, sections/, utilities/

Avoid overly-specific selectors; keep specificity low.

Git conventions
Branching

main is deployable

Feature branches:

feat/<short-description>

fix/<short-description>

chore/<short-description>

Commits (recommended)

Use Conventional Commits:

feat(theme): add sticky header behavior

fix(cart): prevent drawer crash on empty items

chore: bump dependencies

QA checklist (theme)

Before pushing to production:

Test: Home, Collection, PDP, Cart, Search, Account

Mobile + desktop

Cart add/remove/update quantity

Variant changes + price/media updates

No Liquid errors in Theme Editor

Lighthouse sanity check (especially CLS on PDP/collection)