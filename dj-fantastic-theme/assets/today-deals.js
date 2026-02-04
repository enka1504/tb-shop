(function () {
  const moneyFmt = (() => {
    // Shopify gives prices in cents in product JSON
    // We’ll render using Shopify's money format if available; fallback to USD.
    const fmt = window.Shopify && window.Shopify.money_format ? window.Shopify.money_format : "${{amount}}";
    return (cents) => {
      const amount = (Number(cents) / 100).toFixed(2);
      // minimal formatter supporting {{amount}} only
      return fmt.replace("{{amount}}", amount);
    };
  })();

  function qs(root, sel) { return root.querySelector(sel); }
  function qsa(root, sel) { return Array.from(root.querySelectorAll(sel)); }

  async function addToCart(variantId, qty) {
    const res = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ items: [{ id: Number(variantId), quantity: Number(qty) }] })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function fetchProduct(handle) {
    const res = await fetch(`/products/${handle}.js`, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error('Failed to load product details');
    return res.json();
  }

  function pctOff(compareCents, priceCents) {
    if (!compareCents || compareCents <= priceCents) return null;
    const pct = Math.round(((compareCents - priceCents) * 100) / compareCents);
    return pct;
  }

  function setQtyStepper(root, inputSel, minusSel, plusSel) {
    const input = qs(root, inputSel);
    const minus = qs(root, minusSel);
    const plus = qs(root, plusSel);

    if (!input) return { get: () => 1, set: () => {} };

    const clamp = () => {
      const v = Math.max(1, Number(input.value || 1));
      input.value = String(v);
      return v;
    };

    minus && minus.addEventListener('click', () => { input.value = String(Math.max(1, clamp() - 1)); });
    plus && plus.addEventListener('click', () => { input.value = String(clamp() + 1); });
    input.addEventListener('change', clamp);

    return { get: clamp, set: (v) => { input.value = String(Math.max(1, Number(v || 1))); } };
  }

  function initTabs(section) {
    const tabs = qsa(section, '[data-td-tab]');
    const panels = qsa(section, '[data-td-panel]');

    function activate(targetId) {
      tabs.forEach(t => {
        const on = t.dataset.target === targetId;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) t.dataset.active = 'true';
        else t.removeAttribute('data-active');
      });
      panels.forEach(p => {
        const on = p.id === targetId;
        p.hidden = !on;
        if (on) p.dataset.active = 'true';
        else p.removeAttribute('data-active');
      });
    }

    tabs.forEach(t => t.addEventListener('click', () => activate(t.dataset.target)));
  }

  function initCarousel(root) {
    const track = qs(root, '[data-td-track]');
    const prev = qs(root, '[data-td-prev]');
    const next = qs(root, '[data-td-next]');
    if (!track) return;

    const scrollByCards = (dir) => {
      const card = track.querySelector('.td__card');
      const delta = card ? (card.getBoundingClientRect().width + 18) * 2 : track.clientWidth * 0.8;
      track.scrollBy({ left: dir * delta, behavior: 'smooth' });
    };

    prev && prev.addEventListener('click', () => scrollByCards(-1));
    next && next.addEventListener('click', () => scrollByCards(1));
  }

  function initCardActions(section) {
    // qty steppers on cards
    qsa(section, '[data-td-qty]').forEach(qtyWrap => {
      const input = qs(qtyWrap, '.td__qtyInput');
      const minus = qs(qtyWrap, '[data-qty-minus]');
      const plus = qs(qtyWrap, '[data-qty-plus]');
      if (!input) return;

      const clamp = () => {
        const v = Math.max(1, Number(input.value || 1));
        input.value = String(v);
        return v;
      };
      minus && minus.addEventListener('click', () => { input.value = String(Math.max(1, clamp() - 1)); });
      plus && plus.addEventListener('click', () => { input.value = String(clamp() + 1); });
      input.addEventListener('change', clamp);
    });

    // add to cart on cards
    qsa(section, '[data-td-add]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('.td__card');
        const msg = card && qs(card, '[data-td-msg]');
        const qtyInput = card && qs(card, '.td__qtyInput');
        const qty = Math.max(1, Number(qtyInput?.value || 1));
        const variantId = btn.dataset.variantId;
        if (!variantId) return;

        btn.disabled = true;
        if (msg) msg.textContent = 'Adding…';

        try {
          await addToCart(variantId, qty);
          if (msg) msg.textContent = 'Added to cart ✓';
          document.dispatchEvent(new CustomEvent('cart:refresh'));
        } catch (e) {
          if (msg) msg.textContent = 'Failed to add. Try again.';
          console.error(e);
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  function initQuickView(section) {
    const modal = qs(section, '[data-tdqv]');
    if (!modal) return;

    const closeEls = qsa(modal, '[data-tdqv-close]');
    const mainImg = qs(modal, '[data-tdqv-main-img]');
    const thumbsWrap = qs(modal, '[data-tdqv-thumbs]');
    const prevThumb = qs(modal, '[data-tdqv-prev]');
    const nextThumb = qs(modal, '[data-tdqv-next]');

    const vendorEl = qs(modal, '[data-tdqv-vendor]');
    const titleEl = qs(modal, '[data-tdqv-title]');
    const priceEl = qs(modal, '[data-tdqv-price]');
    const compareEl = qs(modal, '[data-tdqv-compare]');
    const offEl = qs(modal, '[data-tdqv-off]');
    const descEl = qs(modal, '[data-tdqv-desc]');
    const linkEl = qs(modal, '[data-tdqv-link]');
    const msgEl = qs(modal, '[data-tdqv-msg]');

    const variantRow = qs(modal, '[data-tdqv-variant-row]');
    const variantSelect = qs(modal, '[data-tdqv-variant]');
    const addBtn = qs(modal, '[data-tdqv-add]');
    const buyBtn = qs(modal, '[data-tdqv-buy]');

    const qtyApi = setQtyStepper(modal, '.tdqv__qtyInput', '[data-tdqv-minus]', '[data-tdqv-plus]');

    let currentProduct = null;
    let currentVariant = null;
    let currentImages = [];
    let activeImgIdx = 0;

    function open() {
      modal.hidden = false;
      document.documentElement.style.overflow = 'hidden';
    }
    function close() {
      modal.hidden = true;
      document.documentElement.style.overflow = '';
      if (msgEl) msgEl.textContent = '';
    }

    closeEls.forEach(el => el.addEventListener('click', close));
    document.addEventListener('keydown', (e) => {
      if (!modal.hidden && e.key === 'Escape') close();
    });

    function renderGallery(images, startIdx = 0) {
      currentImages = images || [];
      activeImgIdx = Math.max(0, Math.min(startIdx, currentImages.length - 1));

      if (mainImg) {
        mainImg.src = currentImages[activeImgIdx] || '';
        mainImg.alt = (currentProduct?.title || 'Product image');
      }

      if (!thumbsWrap) return;
      thumbsWrap.innerHTML = '';

      currentImages.forEach((src, idx) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'tdqv__thumb';
        if (idx === activeImgIdx) b.dataset.active = 'true';
        b.setAttribute('aria-label', `View image ${idx + 1}`);
        b.innerHTML = `<img alt="" loading="lazy" src="${src}">`;
        b.addEventListener('click', () => {
          activeImgIdx = idx;
          renderGallery(currentImages, activeImgIdx);
        });
        thumbsWrap.appendChild(b);
      });
    }

    function scrollThumbs(dir) {
      if (!thumbsWrap) return;
      const delta = 120 * dir;
      thumbsWrap.scrollBy({ left: delta, behavior: 'smooth' });
    }

    prevThumb && prevThumb.addEventListener('click', () => scrollThumbs(-1));
    nextThumb && nextThumb.addEventListener('click', () => scrollThumbs(1));

    function setVariant(variantId) {
      if (!currentProduct) return;
      const v = currentProduct.variants.find(x => String(x.id) === String(variantId)) || currentProduct.variants[0];
      currentVariant = v;

      const p = v.price;
      const c = v.compare_at_price;

      if (priceEl) priceEl.textContent = moneyFmt(p);
      const off = pctOff(c, p);

      if (compareEl) {
        if (c && c > p) {
          compareEl.hidden = false;
          compareEl.textContent = moneyFmt(c);
        } else {
          compareEl.hidden = true;
          compareEl.textContent = '';
        }
      }
      if (offEl) {
        if (off != null) {
          offEl.hidden = false;
          offEl.textContent = `-${off}%`;
        } else {
          offEl.hidden = true;
          offEl.textContent = '';
        }
      }

      if (addBtn) addBtn.disabled = !v.available;
      if (buyBtn) buyBtn.disabled = !v.available;
    }

    function renderVariants(product, preferredVariantId) {
      if (!variantRow || !variantSelect) return;

      if (!product.variants || product.variants.length <= 1) {
        variantRow.hidden = true;
        return;
      }

      variantRow.hidden = false;
      variantSelect.innerHTML = '';

      product.variants.forEach(v => {
        const opt = document.createElement('option');
        opt.value = String(v.id);
        opt.textContent = v.title + (v.available ? '' : ' — Sold out');
        opt.disabled = !v.available;
        variantSelect.appendChild(opt);
      });

      const startId = preferredVariantId && product.variants.some(v => String(v.id) === String(preferredVariantId))
        ? preferredVariantId
        : (product.variants.find(v => v.available)?.id || product.variants[0].id);

      variantSelect.value = String(startId);
      variantSelect.addEventListener('change', () => setVariant(variantSelect.value), { once: true });
      variantSelect.addEventListener('change', () => setVariant(variantSelect.value));
    }

    async function openForCard(card) {
      const handle = card.dataset.productHandle;
      const url = card.dataset.productUrl;
      const preferredVariantId = card.dataset.initialVariant;

      if (!handle) return;

      if (msgEl) msgEl.textContent = 'Loading…';
      open();

      try {
        const product = await fetchProduct(handle);
        currentProduct = product;

        if (vendorEl) vendorEl.textContent = product.vendor || '';
        if (titleEl) titleEl.textContent = product.title || '';
        if (descEl) descEl.innerHTML = product.description || ''; // product.description is HTML
        if (linkEl) linkEl.href = url || product.url || '#';

        // images in /products/handle.js are full URLs already
        const imgs = (product.images && product.images.length ? product.images : []);
        renderGallery(imgs, 0);

        renderVariants(product, preferredVariantId);
        setVariant(preferredVariantId || (product.variants.find(v => v.available)?.id || product.variants[0].id));

        qtyApi.set(1);
        if (msgEl) msgEl.textContent = '';
      } catch (e) {
        console.error(e);
        if (msgEl) msgEl.textContent = 'Failed to load details.';
      }
    }

    // Click eye to open quick view
    qsa(section, '[data-td-eye]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const card = btn.closest('.td__card');
        if (card) openForCard(card);
      });
    });

    // Quick view add to cart
    addBtn && addBtn.addEventListener('click', async () => {
      if (!currentVariant) return;
      const qty = qtyApi.get();

      addBtn.disabled = true;
      if (msgEl) msgEl.textContent = 'Adding…';

      try {
        await addToCart(currentVariant.id, qty);
        if (msgEl) msgEl.textContent = 'Added to cart ✓';
        document.dispatchEvent(new CustomEvent('cart:refresh'));
      } catch (e) {
        console.error(e);
        if (msgEl) msgEl.textContent = 'Failed to add. Try again.';
      } finally {
        addBtn.disabled = !currentVariant.available;
      }
    });

    // Buy it now: add then go checkout
    buyBtn && buyBtn.addEventListener('click', async () => {
      if (!currentVariant) return;
      const qty = qtyApi.get();

      buyBtn.disabled = true;
      if (msgEl) msgEl.textContent = 'Redirecting…';

      try {
        await addToCart(currentVariant.id, qty);
        window.location.href = '/checkout';
      } catch (e) {
        console.error(e);
        if (msgEl) msgEl.textContent = 'Failed. Try again.';
        buyBtn.disabled = !currentVariant.available;
      }
    });
  }

  function initSection(section) {
    initTabs(section);

    qsa(section, '[data-td-carousel]').forEach(initCarousel);

    initCardActions(section);
    initQuickView(section);
  }

  function boot() {
    document.querySelectorAll('[data-td-section]').forEach(initSection);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Shopify theme editor live reload
  document.addEventListener('shopify:section:load', (e) => {
    const section = e.target?.querySelector?.('[data-td-section]') || e.target;
    if (section && section.matches && section.matches('[data-td-section]')) initSection(section);
  });
})();
