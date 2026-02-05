(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function scrollByCard(track, dir = 1) {
    if (!track) return;
    const card = track.querySelector(".hvSlide, .hvP, .hvRecipe, .hvCatCard");
    const step = card ? card.getBoundingClientRect().width + 16 : 320;
    track.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  function bindSlider(section) {
    const track = $("[data-hv-track]", section);
    const prev = $("[data-hv-prev]", section);
    const next = $("[data-hv-next]", section);
    if (prev) prev.addEventListener("click", () => scrollByCard(track, -1));
    if (next) next.addEventListener("click", () => scrollByCard(track, 1));
  }

  // Tabs
  function bindTabs(section) {
    const tabs = $$("[data-hv-tab]", section);
    if (!tabs.length) return;

    const panels = $$("[data-hv-panel]", section);
    const setActive = (id) => {
      tabs.forEach((t) => {
        const active = t.getAttribute("data-hv-tab") === id;
        t.setAttribute("aria-selected", active ? "true" : "false");
      });
      panels.forEach((p) => {
        p.hidden = p.getAttribute("data-hv-panel") !== id;
      });
    };

    tabs.forEach((t) => {
      t.addEventListener("click", () => setActive(t.getAttribute("data-hv-tab")));
    });

    setActive(tabs[0].getAttribute("data-hv-tab"));
  }

  // Qty + Add to cart
  function bindCart(section) {
    $$("[data-hv-qty]", section).forEach((wrap) => {
      const minus = $("[data-qty-minus]", wrap);
      const plus = $("[data-qty-plus]", wrap);
      const input = $("input", wrap);
      if (!input) return;
      minus && minus.addEventListener("click", () => (input.value = Math.max(1, (parseInt(input.value || "1", 10) || 1) - 1)));
      plus && plus.addEventListener("click", () => (input.value = (parseInt(input.value || "1", 10) || 1) + 1));
    });

    $$("[data-hv-add]", section).forEach((btn) => {
      btn.addEventListener("click", async () => {
        const card = btn.closest("[data-variant-id]");
        const variantId = btn.getAttribute("data-variant-id");
        const qtyInput = card ? $("input[type='number']", card) : null;
        const quantity = qtyInput ? Math.max(1, parseInt(qtyInput.value || "1", 10) || 1) : 1;

        btn.disabled = true;
        try {
          const res = await fetch("/cart/add.js", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: [{ id: Number(variantId), quantity }] }),
          });
          if (!res.ok) throw new Error("Add to cart failed");
          document.documentElement.dispatchEvent(new CustomEvent("cart:refresh"));
        } catch (e) {
          console.warn(e);
          alert("Could not add to cart. Please try again.");
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  // Countdown
  function bindCountdown(section) {
    const box = $("[data-hv-countdown]", section);
    if (!box) return;

    const endTs = parseInt(box.getAttribute("data-end-ts") || "0", 10) * 1000;
    const dEl = $("[data-hv-d]", box);
    const hEl = $("[data-hv-h]", box);
    const mEl = $("[data-hv-m]", box);
    const sEl = $("[data-hv-s]", box);

    function tick() {
      const now = Date.now();
      let diff = Math.max(0, endTs - now);
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      diff -= d * (1000 * 60 * 60 * 24);
      const h = Math.floor(diff / (1000 * 60 * 60));
      diff -= h * (1000 * 60 * 60);
      const m = Math.floor(diff / (1000 * 60));
      diff -= m * (1000 * 60);
      const s = Math.floor(diff / 1000);

      if (dEl) dEl.textContent = String(d).padStart(2, "0");
      if (hEl) hEl.textContent = String(h).padStart(2, "0");
      if (mEl) mEl.textContent = String(m).padStart(2, "0");
      if (sEl) sEl.textContent = String(s).padStart(2, "0");
    }

    tick();
    setInterval(tick, 1000);
  }

  // Quick view (simple): opens product page in new tab if you want minimal
  // If you already have a quick-view modal from earlier, we can wire this to it later.
  function bindQuickView(section) {
    $$("[data-hv-eye]", section).forEach((btn) => {
      btn.addEventListener("click", () => {
        const card = btn.closest("[data-product-url]");
        const url = card ? card.getAttribute("data-product-url") : null;
        if (url) window.location.href = url; // simplest reliable behavior
      });
    });
  }

  // Video pause button
  function bindVideo(section) {
    const v = $("video[data-hv-video]", section);
    const btn = $("[data-hv-video-toggle]", section);
    if (!v || !btn) return;

    const sync = () => (btn.textContent = v.paused ? "▶" : "⏸");
    btn.addEventListener("click", () => {
      if (v.paused) v.play(); else v.pause();
      sync();
    });
    v.addEventListener("play", sync);
    v.addEventListener("pause", sync);
    sync();
  }

  function init() {
    $$("[data-hv-section]").forEach((section) => {
      bindSlider(section);
      bindTabs(section);
      bindCart(section);
      bindCountdown(section);
      bindQuickView(section);
      bindVideo(section);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
