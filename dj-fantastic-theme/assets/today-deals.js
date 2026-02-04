(function () {
  function qs(root, sel) { return root.querySelector(sel); }
  function qsa(root, sel) { return Array.from(root.querySelectorAll(sel)); }

  async function addToCart(variantId, qty) {
    const res = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ items: [{ id: Number(variantId), quantity: Number(qty) }] })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Add to cart failed');
    }
    return res.json();
  }

  function initSection(section) {
    // Tabs
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
        if (on) {
          p.hidden = false;
          p.dataset.active = 'true';
        } else {
          p.hidden = true;
          p.removeAttribute('data-active');
        }
      });
    }

    tabs.forEach(t => {
      t.addEventListener('click', () => activate(t.dataset.target));
    });

    // Qty steppers + Add-to-cart
    qsa(section, '[data-td-qty]').forEach(qtyWrap => {
      const input = qs(qtyWrap, 'input');
      const minus = qs(qtyWrap, '[data-qty-minus]');
      const plus = qs(qtyWrap, '[data-qty-plus]');

      minus?.addEventListener('click', () => {
        const v = Math.max(1, Number(input.value || 1) - 1);
        input.value = String(v);
      });
      plus?.addEventListener('click', () => {
        const v = Math.max(1, Number(input.value || 1) + 1);
        input.value = String(v);
      });
      input?.addEventListener('change', () => {
        const v = Math.max(1, Number(input.value || 1));
        input.value = String(v);
      });
    });

    qsa(section, '[data-td-add]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('.td__card');
        const msg = card?.querySelector('[data-td-msg]');
        const qtyInput = card?.querySelector('.td__qtyInput');
        const qty = Number(qtyInput?.value || 1);
        const variantId = btn.dataset.variantId;

        if (!variantId) return;

        btn.disabled = true;
        if (msg) msg.textContent = 'Adding…';

        try {
          await addToCart(variantId, qty);
          if (msg) msg.textContent = 'Added to cart ✓';
          // Optional: open cart drawer if your theme supports it (custom event)
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
