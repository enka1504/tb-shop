(() => {
  const KEY = "collection_view";

  function setView(root, view) {
    const container = root.querySelector("[data-products-container]");
    if (!container) return;

    container.classList.toggle("is-grid", view === "grid");
    container.classList.toggle("is-list", view === "list");

    root.querySelectorAll("[data-view-btn]").forEach((btn) => {
      const isActive = btn.getAttribute("data-view-btn") === view;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    try { localStorage.setItem(KEY, view); } catch (_) {}
  }

  function getInitialView(root) {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "grid" || saved === "list") return saved;
    } catch (_) {}
    const def = root.getAttribute("data-default-view");
    return (def === "list" || def === "grid") ? def : "grid";
  }

  function wireSort(root) {
    const sort = root.querySelector("[data-sort-by]");
    if (!sort) return;

    sort.addEventListener("change", () => {
      const url = new URL(window.location.href);
      url.searchParams.set("sort_by", sort.value);
      window.location.href = url.toString();
    });
  }

  function wireQty(root) {
    root.addEventListener("click", (e) => {
      const minus = e.target.closest("[data-qty-minus]");
      const plus = e.target.closest("[data-qty-plus]");
      if (!minus && !plus) return;

      const card = e.target.closest("[data-product-card]");
      if (!card) return;

      const input = card.querySelector("[data-qty-input]");
      const formQty = card.querySelector("[data-form-qty]");
      if (!input) return;

      const current = parseInt(input.value || "1", 10);
      const next = minus ? Math.max(1, current - 1) : Math.max(1, current + 1);

      input.value = String(next);
      if (formQty) formQty.value = String(next);
    });

    root.addEventListener("change", (e) => {
      const input = e.target.closest("[data-qty-input]");
      if (!input) return;

      const card = e.target.closest("[data-product-card]");
      const formQty = card ? card.querySelector("[data-form-qty]") : null;

      let val = parseInt(input.value || "1", 10);
      if (Number.isNaN(val) || val < 1) val = 1;

      input.value = String(val);
      if (formQty) formQty.value = String(val);
    });
  }

  function init(root) {
    const initial = getInitialView(root);
    setView(root, initial);

    root.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-view-btn]");
      if (!btn) return;
      setView(root, btn.getAttribute("data-view-btn"));
    });

    wireSort(root);
    wireQty(root);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-collection-toggle]").forEach(init);
  });
})();
