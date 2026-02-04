(function () {
  const moneyFmt = (() => {
    const fmt = window.Shopify && window.Shopify.money_format ? window.Shopify.money_format : "${{amount}}";
    return (cents) => fmt.replace("{{amount}}", (Number(cents) / 100).toFixed(2));
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
    return Math.round(((compareCents - priceCents) * 100) / compareCents);
  }

  function initCarousel(section) {
    const track = qs(section, '[data-phw-track]');
    const prev = qs(section, '[data-phw-prev]');
    const next = qs(section, '[data-phw-next]');
    if (!track) return;

    const scrollByCards = (dir) => {
      const card = track.querySelector('.phw__card');
      const delta = card ? (card.getBoundingClientRect().width + 18) * 2 : track.clientWidth * 0.8;
      track.scrollBy({ left: dir * delta, behavior: 'smooth' });
    };

    prev && prev.addEventListener('click', () => scrollByCards(-1));
    next && next.addEventListener('click', () => scrollByCards(1));
  }

  function initQtySteppers(section) {
    qsa(section, '[data-phw-qty]').forEach(qtyWrap => {
      const input = qs(qtyWrap, '.phw__qtyInput');
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
  }

  function initAddToCart(section) {
    qsa(section, '[data-phw-add]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('.phw__card');
        const msg = card && qs(card, '[data-phw-msg]');
        const qtyInput = card && qs(card, '.phw__qtyInput');
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
          console.error(e);
          if (msg) msg.textContent = 'Failed to add. Try again.';
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  function initCountdown(section) {
    const el = qs(section, '[data-phw-countdown]');
    if (!el) return;

    // If merchant didn't set a valid date, default to +24h
    let endTs = Number(el.dataset.endTs || 0);
    if (!endTs || Number.isNaN(endTs)) {
      endTs = Math.floor(Date.now() / 1000) + 24 * 3600;
    }

    const dEl = qs(el, '[data-phw-d]');
    const hEl = qs(el, '[data-phw-h]');
    const mEl = qs(el, '[data-phw-m]');
    const sEl = qs(el, '[data-phw-s]');

    const pad = (n) => String(Math.max(0, n)).padStart(2, '0');

    function tick() {
      const now = Math.floor(Date.now() / 1000);
      let left = endTs - now;
      if (left < 0) left = 0;

      const d = Math.floor(left / 86400);
      left -= d * 86400;
      const h = Math.floor(left / 3600);
      left -= h * 3600;
      const m = Math.floor(left / 60);
      const s = left - m * 60;

      if (dEl) dEl.textContent = pad(d);
      if (hEl) hEl.textContent = pad(h);
      if (mEl) mEl.textContent = pad(m);
      if (sEl) sEl.textContent = pad(s);
    }

    tick();
    setInterval(tick, 1000);
  }

  function initQuickView(section) {
    const modal = qs(section, '[data-phwqv]');
    if (!modal) return;

    const closeEls = qsa(modal, '[data-phwqv-close]');
    const mainImg = qs(modal, '[data-phwqv-main-img]');
    const thumbsWrap = qs(modal, '[data-phwqv-thumbs]');
    const prevThumb = qs(modal, '[data-phwqv-prev]');
    const nextThumb = qs(modal, '[data-phwqv-next]');

    const vendorEl = qs(modal, '[data-phwqv-vendor]');
    const titleEl = qs(modal, '[data-phwqv-title]');
    const priceEl = qs(modal, '[data-phwqv-price]');
    const compareEl = qs(modal, '[data-phwqv-compare]');
    const offEl = qs(modal, '[data-phwqv-off]');
    const descEl = qs(modal, '[data-phwqv-desc]');
    const linkEl = qs(modal, '[data-phwqv-link]');
    const msgEl = qs(modal, '[data-phwqv-msg]');

    const variantRow = qs(modal, '[data-phwqv-variant-row]');
    const variantSelect = qs(modal, '[data-phwqv-variant]');
    const addBtn = qs(modal, '[data-phwqv-add]');
    const buyBtn = qs(modal, '[data-phwqv-buy]');

    const qtyInput = qs(modal, '.phwqv__qtyInput');
    const minus = qs(modal, '[data-phwqv-minus]');
    const plus = qs(modal, '[data-phwqv-plus]');

    let currentProduct = null;
    let currentVariant = null;
    let currentImages = [];
    let activeIdx = 0;

    const padQty = () => {
      if (!qtyInput) return 1;
      const v = Math.max(1, Number(qtyInput.value || 1));
      qtyInput.value = String(v);
      return v;
    };
    minus && minus.addEventListener('click', () => { qtyInput.value = String(Math.max(1, padQty() - 1)); });
    plus && plus.addEventListener('click', () => { qtyInput.value = String(padQty() + 1); });
    qtyInput && qtyInput.addEventListener('change', padQty);

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
    document.addEventListener('keydown', (e) => { if (!modal.hidden && e.key === 'Escape') close(); });

    function renderGallery(images, startIdx = 0) {
      currentImages = images || [];
      activeIdx = Math.max(0, Math.min(startIdx, currentImages.length - 1));
      if (mainImg) {
        mainImg.src = currentImages[activeIdx] || '';
        mainImg.alt = currentProduct?.title || '';
      }
      if (!thumbsWrap) return;
      thumbsWrap.innerHTML = '';

      currentImages.forEach((src, idx) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'phwqv__thumb';
        if (idx === activeIdx) b.dataset.active = 'true';
        b.innerHTML = `<img alt="" loading="lazy" src="${src}">`;
        b.addEventListener('click', () => renderGallery(currentImages, idx));
        thumbsWrap.appendChild(b);
      });
    }

    function scrollThumbs(dir) {
      if (!thumbsWrap) return;
      thumbsWrap.scrollBy({ left: 120 * dir, behavior: 'smooth' });
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
        if (c && c > p) { compareEl.hidden = false; compareEl.textContent = moneyFmt(c); }
        else { compareEl.hidden = true; compareEl.textContent = ''; }
      }
      if (offEl) {
        if (off != null) { offEl.hidden = false; offEl.textContent = `-${off}%`; }
        else { offEl.hidden = true; offEl.textContent = ''; }
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

      const startId =
        (preferredVariantId && product.variants.some(v => String(v.id) === String(preferredVariantId)))
          ? preferredVariantId
          : (product.variants.find(v => v.available)?.id || product.variants[0].id);

      variantSelect.value = String(startId);
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
        if (descEl) descEl.innerHTML = product.description || '';
        if (linkEl) linkEl.href = url || '#';

        renderGallery(product.images || [], 0);
        renderVariants(product, preferredVariantId);

        const startVar = preferredVariantId || (product.variants.find(v => v.available)?.id || product.variants[0].id);
        setVariant(startVar);

        if (qtyInput) qtyInput.value = '1';
        if (msgEl) msgEl.textContent = '';
      } catch (e) {
        console.error(e);
        if (msgEl) msgEl.textContent = 'Failed to load details.';
      }
    }

    qsa(section, '[data-phw-eye]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const card = btn.closest('.phw__card');
        if (card) openForCard(card);
      });
    });

    addBtn && addBtn.addEventListener('click', async () => {
      if (!currentVariant) return;
      const qty = padQty();

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

    buyBtn && buyBtn.addEventListener('click', async () => {
      if (!currentVariant) return;
      const qty = padQty();

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

  function init(section) {
    initCountdown(section);
    initCarousel(section);
    initQtySteppers(section);
    initAddToCart(section);
    initQuickView(section);
  }

  function boot() {
    document.querySelectorAll('[data-phw-section]').forEach(init);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  document.addEventListener('shopify:section:load', (e) => {
    const section = e.target?.querySelector?.('[data-phw-section]') || e.target;
    if (section && section.matches && section.matches('[data-phw-section]')) init(section);
  });
})();
