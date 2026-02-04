(() => {
  const state = {
    lastFocus: null,
    overlay: null,
    filterDrawer: null,
    quickView: null,
  };

  function lockScroll(lock) {
    document.documentElement.classList.toggle("fh-lock", lock);
  }

  function show(el) {
    el.hidden = false;
    el.setAttribute("aria-hidden", "false");
  }

  function hide(el) {
    el.hidden = true;
    el.setAttribute("aria-hidden", "true");
  }

  // ---------- FILTER DRAWER ----------
  function getActiveFilterCount(form) {
    if (!form) return 0;
    // count checked checkboxes + filled price inputs
    const checks = form.querySelectorAll('input[type="checkbox"]:checked').length;
    const min = form.querySelector('input[name*="min"]')?.value?.trim();
    const max = form.querySelector('input[name*="max"]')?.value?.trim();
    const price = (min || max) ? 1 : 0;
    return checks + price;
  }

  function updateApplyCount() {
    const form = document.querySelector("[data-fh-filter-form]");
    const out = document.querySelector("[data-fh-active-count]");
    if (!form || !out) return;
    out.textContent = String(getActiveFilterCount(form));
  }

  function openFilterDrawer() {
    state.lastFocus = document.activeElement;
    show(state.overlay);
    show(state.filterDrawer);
    lockScroll(true);
    updateApplyCount();
  }

  function closeFilterDrawer() {
    hide(state.filterDrawer);
    hide(state.overlay);
    lockScroll(false);
    if (state.lastFocus && typeof state.lastFocus.focus === "function") state.lastFocus.focus();
  }

  function wireFilterDrawer() {
    if (!state.filterDrawer) return;

    // open
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-open-filters]");
      if (!btn) return;
      openFilterDrawer();
    });

    // close
    state.filterDrawer.addEventListener("click", (e) => {
      if (e.target.closest("[data-fh-close]")) closeFilterDrawer();
    });

    // overlay close
    state.overlay.addEventListener("click", () => {
      // close whichever is open
      if (!state.filterDrawer.hidden) closeFilterDrawer();
      if (!state.quickView.hidden) closeQuickView();
    });

    // live apply count
    const form = state.filterDrawer.querySelector("[data-fh-filter-form]");
    if (form) {
      form.addEventListener("change", updateApplyCount);
      form.addEventListener("input", updateApplyCount);

      // reset list filter (by param)
      state.filterDrawer.addEventListener("click", (e) => {
        const reset = e.target.closest("[data-fh-reset-filter]");
        if (!reset) return;
        const param = reset.getAttribute("data-param");
        form.querySelectorAll(`input[name="${param}"], input[name^="${param}"]`).forEach((i) => {
          if (i.type === "checkbox") i.checked = false;
          else i.value = "";
        });
        updateApplyCount();
      });

      // reset price
      state.filterDrawer.addEventListener("click", (e) => {
        if (!e.target.closest("[data-fh-reset-price]")) return;
        const min = form.querySelector('input[name*="min"]');
        const max = form.querySelector('input[name*="max"]');
        if (min) min.value = "";
        if (max) max.value = "";
        const rmin = form.querySelector("[data-fh-min-range]");
        const rmax = form.querySelector("[data-fh-max-range]");
        if (rmin) rmin.value = rmin.min || "0";
        if (rmax) rmax.value = rmax.max || rmax.value;
        updateApplyCount();
      });

      // simple range -> inputs binding
      const minRange = form.querySelector("[data-fh-min-range]");
      const maxRange = form.querySelector("[data-fh-max-range]");
      const minInput = form.querySelector('input[name*="min"]');
      const maxInput = form.querySelector('input[name*="max"]');

      function syncFromRanges() {
        const a = Number(minRange?.value || 0);
        const b = Number(maxRange?.value || 0);
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        if (minInput) minInput.value = String(lo);
        if (maxInput) maxInput.value = String(hi);
        updateApplyCount();
      }
      minRange?.addEventListener("input", syncFromRanges);
      maxRange?.addEventListener("input", syncFromRanges);
    }

    // ESC
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (!state.filterDrawer.hidden) closeFilterDrawer();
      if (!state.quickView.hidden) closeQuickView();
    });
  }

  // ---------- QUICK VIEW ----------
  async function openQuickView(handleOrUrl) {
    state.lastFocus = document.activeElement;
    show(state.overlay);
    show(state.quickView);
    lockScroll(true);

    const content = state.quickView.querySelector("[data-qv-content]");
    content.innerHTML = `<div class="qv-loading">Loading…</div>`;

    const url = handleOrUrl.includes("/products/")
      ? `${handleOrUrl}${handleOrUrl.includes("?") ? "&" : "?"}view=quick-view`
      : `/products/${handleOrUrl}?view=quick-view`;

    try {
      const res = await fetch(url, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`Quick view fetch failed: ${res.status}`);
      const html = await res.text();
      content.innerHTML = html;
      wireQuickViewQty(content);
    } catch (err) {
      content.innerHTML = `<div class="qv-loading">Failed to load.</div>`;
      // optional: console.error(err);
    }
  }

function closeQuickView() {
  if (!state.quickView) return;
  state.quickView.setAttribute("aria-hidden", "true");
  state.quickView.hidden = true;

  // also hide overlay IF filter isn't open
  if (state.overlay && state.filterDrawer?.hidden !== false) {
    state.overlay.hidden = true;
  }

  lockScroll(false);
  if (state.lastFocus && typeof state.lastFocus.focus === "function") state.lastFocus.focus();
}


  
function wireQuickView() {
  if (!state.quickView) return;

  // open ONLY when clicking a real button
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-quick-view]");
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    const url = btn.getAttribute("data-product-url");
    const card = btn.closest("[data-product-card]");
    const handle = card?.getAttribute("data-product-handle");

    openQuickView(url || handle);
  });

  // close button inside modal
  state.quickView.addEventListener("click", (e) => {
    if (e.target.closest("[data-qv-close]")) {
      e.preventDefault();
      closeQuickView();
    }
  });

  // click outside panel closes
  state.quickView.addEventListener("click", (e) => {
    const panel = state.quickView.querySelector(".qv-modal__panel");
    if (panel && !panel.contains(e.target)) closeQuickView();
  });
}

  function wireQuickViewQty(scope) {
    scope.addEventListener("click", (e) => {
      const minus = e.target.closest("[data-qv-qty-minus]");
      const plus = e.target.closest("[data-qv-qty-plus]");
      if (!minus && !plus) return;

      const input = scope.querySelector("[data-qv-qty-input]");
      const formQty = scope.querySelector("[data-qv-form-qty]");
      const cur = parseInt(input?.value || "1", 10);
      const next = minus ? Math.max(1, cur - 1) : Math.max(1, cur + 1);

      if (input) input.value = String(next);
      if (formQty) formQty.value = String(next);
    });

    scope.addEventListener("change", (e) => {
      const input = e.target.closest("[data-qv-qty-input]");
      if (!input) return;

      let val = parseInt(input.value || "1", 10);
      if (Number.isNaN(val) || val < 1) val = 1;

      input.value = String(val);
      const formQty = scope.querySelector("[data-qv-form-qty]");
      if (formQty) formQty.value = String(val);
    });
  }

  // ---------- INIT ----------
  document.addEventListener("DOMContentLoaded", () => {
    state.overlay = document.querySelector("[data-fh-overlay]");
    state.filterDrawer = document.querySelector("[data-fh-filter-drawer]");
    state.quickView = document.querySelector("[data-qv-modal]");

    if (!state.overlay || !state.filterDrawer || !state.quickView) return;

    wireFilterDrawer();
    wireQuickView();
  });
})();
