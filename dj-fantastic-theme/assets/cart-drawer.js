(() => {
  const money = (cents, currency = "USD") =>
    (cents / 100).toLocaleString(undefined, { style: "currency", currency });

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const upsellCache = new Map(); // handle -> products array

function shuffleInPlace(arr){
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function fetchCollectionProducts(handle){
  if (!handle) return [];
  if (upsellCache.has(handle)) return upsellCache.get(handle);

  const res = await fetch(`/collections/${encodeURIComponent(handle)}/products.json?limit=250`, {
    headers: { 'Accept': 'application/json' }
  });
  if (!res.ok) return [];
  const data = await res.json();

  // Normalize: keep only what we need
  const products = (data.products || []).map(p => {
    const variant = (p.variants && p.variants[0]) ? p.variants[0] : null;
    return {
      id: p.id,
      title: p.title,
      handle: p.handle,
      image: (p.images && p.images[0]) ? p.images[0].src : '',
      variantId: variant ? variant.id : null,
      price: variant ? Number(variant.price) : null,
      compareAt: variant ? Number(variant.compare_at_price || 0) : 0
    };
  }).filter(p => p.variantId);

  upsellCache.set(handle, products);
  return products;
}

function renderUpsells(drawer, products){
  const list = qs('[data-upsell-list]', drawer);
  if (!list) return;

  if (!products.length){
    list.innerHTML = `
      <div class="cart-drawer__card" style="color:var(--cd-muted);font-size:13px;">
        No recommendations available.
      </div>
    `;
    return;
  }

  list.innerHTML = products.map(p => {
    const img = p.image ? p.image.replace(/(\.[a-z]+)(\?.*)?$/i, '_160x$1$2') : '';
    const priceText = (p.price != null) ? `$${p.price.toFixed(2)}` : '';
    const compareText = (p.compareAt && p.compareAt > p.price) ? ` <span style="text-decoration:line-through;color:var(--cd-muted);font-weight:600;">$${p.compareAt.toFixed(2)}</span>` : '';

    return `
      <div class="cart-drawer__upsellItem">
        <img src="${img}" alt="${(p.title||'').replace(/"/g,'&quot;')}" loading="lazy" width="54" height="54">
        <div>
          <p class="cart-drawer__upsellName">${p.title}</p>
          <div class="cart-drawer__upsellPrice">${priceText}${compareText}</div>
        </div>
        <button class="cart-drawer__plus" type="button" data-upsell-add data-variant-id="${p.variantId}">+</button>
      </div>
    `;
  }).join('');
}

async function refreshUpsells(drawer){
  const cfgEl = qs('[data-upsell-config]', drawer);
  if (!cfgEl) return;

  let cfg = { collectionHandle: '', count: 6 };
  try { cfg = Object.assign(cfg, JSON.parse(cfgEl.textContent || '{}')); } catch(_) {}

  const handle = (cfg.collectionHandle || '').trim();
  const count = Number(cfg.count || 6);  

  if (!handle){
    renderUpsells(drawer, []);
    return;
  }

  const pool = await fetchCollectionProducts(handle);

  // Optional: avoid recommending items already in cart
  const cart = await fetchCart();
  const inCartHandles = new Set((cart.items || []).map(i => i.handle));
  const filtered = pool.filter(p => !inCartHandles.has(p.handle));

  const picks = shuffleInPlace(filtered.slice()).slice(0, count);
  renderUpsells(drawer, picks);

  // re-bind upsell add buttons (since we replaced HTML)
  qsa('[data-upsell-add]', drawer).forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await addVariant(btn.getAttribute('data-variant-id'), 1);
        const updated = await fetchCart();
        renderItems(updated, drawer);
        // refresh again to get a new random set after adding an upsell too
        await refreshUpsells(drawer);
      } finally {
        btn.disabled = false;
      }
    });
  });
}

  function getDrawer() {
    return qs('[data-cart-drawer]');
  }

  function openDrawer() {
    const drawer = getDrawer();
    if (!drawer) return;
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add('is-open'));
    document.documentElement.classList.add('cart-drawer-open');
  }

  function closeDrawer() {
    const drawer = getDrawer();
    if (!drawer) return;
    drawer.classList.remove('is-open');
    document.documentElement.classList.remove('cart-drawer-open');
    // allow transition to finish
    setTimeout(() => { drawer.hidden = true; }, 250);
  }

  async function fetchCart() {
    const res = await fetch('/cart.js', { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error('Failed to fetch cart');
    return res.json();
  }

  function renderItems(cart, drawer) {
    const itemsRoot = qs('[data-cart-drawer-items]', drawer);
    const totalEl = qs('[data-cart-drawer-total]', drawer);
    const currency = (cart.currency || (window.Shopify && Shopify.currency && Shopify.currency.active)) || 'USD';

    totalEl.textContent = money(cart.total_price || 0, currency);

    if (!cart.items || cart.items.length === 0) {
      itemsRoot.innerHTML = `
        <div class="cart-drawer__card" style="text-align:center;color:var(--cd-muted);">
          Your cart is empty.
        </div>
      `;
      return;
    }

    itemsRoot.innerHTML = cart.items.map((it) => {
      const img = it.image ? it.image.replace(/(\.[a-z]+)(\?.*)?$/i, '_160x$1$2') : '';
      return `
        <div class="cart-drawer__card" data-line-item data-key="${it.key}">
          <div class="cart-drawer__item">
            <img src="${img}" alt="${(it.product_title || '').replace(/"/g, '&quot;')}">
            <div>
              <p class="cart-drawer__itemTitle">${it.product_title || ''}</p>
              <div class="cart-drawer__price">${money(it.final_line_price || 0, currency)}</div>
              <div class="cart-drawer__subprice">${money(it.final_price || 0, currency)} / ${(it.unit_price_measurement && it.unit_price_measurement.reference_value) ? it.unit_price_measurement.reference_value : 'ea'}</div>

              <div class="cart-drawer__row">
                <div class="cart-drawer__qty">
                  <button type="button" data-qty-dec aria-label="Decrease">−</button>
                  <input type="number" min="0" value="${it.quantity}" data-qty-input>
                  <button type="button" data-qty-inc aria-label="Increase">+</button>
                </div>

                <button class="cart-drawer__trash" type="button" data-remove aria-label="Remove">
                  🗑
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  async function setLineItemQuantity(key, quantity) {
    const res = await fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ id: key, quantity })
    });
    if (!res.ok) throw new Error('Failed cart change');
    return res.json();
  }

  async function addVariant(variantId, quantity = 1) {
    const res = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ items: [{ id: Number(variantId), quantity }] })
    });
    if (!res.ok) throw new Error('Failed cart add');
    return res.json();
  }

  async function updateCartNote(note) {
    await fetch('/cart/update.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ note })
    });
  }

  function bindDrawerEvents(drawer) {
    const backdrop = qs('[data-cart-drawer-backdrop]', drawer);
    const closeBtn = qs('[data-cart-drawer-close]', drawer);

    backdrop?.addEventListener('click', closeDrawer);
    closeBtn?.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
    });

    // cart note
    const noteEl = qs('[data-cart-note]', drawer);
    let noteTimer = null;
    noteEl?.addEventListener('input', () => {
      clearTimeout(noteTimer);
      noteTimer = setTimeout(() => updateCartNote(noteEl.value || ''), 350);
    });

    // share cart (basic)
    const share = qs('[data-cart-drawer-share]', drawer);
    share?.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await navigator.clipboard.writeText(window.location.origin + '/cart');
        share.textContent = 'Copied!';
        setTimeout(() => share.innerHTML = share.innerHTML.replace('Copied!', 'Share cart'), 900);
      } catch (_) {}
    });

    // discount (optional hook)
    const discount = qs('[data-cart-drawer-discount]', drawer);
    discount?.addEventListener('click', (e) => {
      e.preventDefault();
      // You can open your discount UI here
      alert('Add a discount UI here.');
    });

    // upsell add
    qsa('[data-upsell-add]', drawer).forEach(btn => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          await addVariant(btn.getAttribute('data-variant-id'), 1);
          const cart = await fetchCart();
          renderItems(cart, drawer);
          openDrawer();
        } finally {
          btn.disabled = false;
        }
      });
    });

    // delegate qty/remove events
    drawer.addEventListener('click', async (e) => {
      const card = e.target.closest('[data-line-item]');
      if (!card) return;

      const key = card.getAttribute('data-key');
      const input = qs('[data-qty-input]', card);

      if (e.target.matches('[data-remove]')) {
        const cart = await setLineItemQuantity(key, 0);
        renderItems(cart, drawer);
        return;
      }

      if (e.target.matches('[data-qty-inc]')) {
        const q = Math.max(0, parseInt(input.value || '0', 10) + 1);
        input.value = String(q);
        const cart = await setLineItemQuantity(key, q);
        renderItems(cart, drawer);
        return;
      }

      if (e.target.matches('[data-qty-dec]')) {
        const q = Math.max(0, parseInt(input.value || '0', 10) - 1);
        input.value = String(q);
        const cart = await setLineItemQuantity(key, q);
        renderItems(cart, drawer);
        return;
      }
    });

    drawer.addEventListener('change', async (e) => {
      const input = e.target.closest('[data-qty-input]');
      if (!input) return;
      const card = e.target.closest('[data-line-item]');
      const key = card.getAttribute('data-key');
      const q = Math.max(0, parseInt(input.value || '0', 10));
      const cart = await setLineItemQuantity(key, q);
      renderItems(cart, drawer);
    });
  }

  async function refreshDrawer() {
    const drawer = getDrawer();
    if (!drawer) return;
    const cart = await fetchCart();
    renderItems(cart, drawer);
  }

  // Intercept "Add to cart" to open drawer
  function bindAddToCartInterception() {
    document.addEventListener('submit', async (e) => {
      const form = e.target;
      if (!form || !form.matches('form[action*="/cart/add"]')) return;

      // allow opt-out per form
      if (form.hasAttribute('data-disable-cart-drawer')) return;

      e.preventDefault();

      const fd = new FormData(form);
      const id = fd.get('id');
      const qty = Number(fd.get('quantity') || 1);

      try {
        await addVariant(id, qty);
        await refreshDrawer();
        await refreshUpsells(getDrawer());
        openDrawer();
      } catch (err) {
        // fallback to default behavior if error
        form.submit();
      }
    });
  }
  // bootstrap
  function init() {
    const drawer = getDrawer();
    if (!drawer) return;

    const initial = qs('[data-cart-drawer-initial]', drawer);
    if (initial?.textContent) {
      try {
        const cart = JSON.parse(initial.textContent);
        renderItems(cart, drawer);
      } catch (_) {}
    }
    bindDrawerEvents(drawer);
    bindAddToCartInterception();
  }

  document.addEventListener('DOMContentLoaded', init);

  // expose for manual triggers if needed
  window.CartDrawer = { open: openDrawer, close: closeDrawer, refresh: refreshDrawer };
})();