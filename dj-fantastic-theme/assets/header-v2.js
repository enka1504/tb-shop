/* assets/header-v3.js (UPDATED – same logic, new filename so Menu click works even if old JS is cached) */
(() => {
  const ROOT_SELECTOR = "[data-hdr2]";

  function init(root) {
    if (!root || root.__hdr2Inited) return;
    root.__hdr2Inited = true;

    const menuBtn = root.querySelector("[data-hdr2-menu]");
    const drawer = root.querySelector("[data-hdr2-drawer]");
    const closeEls = root.querySelectorAll("[data-hdr2-close]");

    if (!menuBtn || !drawer) return;

    let lastFocus = null;

    const lockScroll = (on) => {
      document.documentElement.style.overflow = on ? "hidden" : "";
    };

    const openDrawer = () => {
      lastFocus = document.activeElement;
      drawer.hidden = false;
      drawer.removeAttribute("hidden");
      drawer.setAttribute("aria-hidden", "false");
      root.classList.add("is-open");
      lockScroll(true);

      const focusable = drawer.querySelector(
        "button, a, input, select, textarea, [tabindex]:not([tabindex='-1'])"
      );
      if (focusable && focusable.focus) focusable.focus();
    };

    const closeDrawer = () => {
      drawer.hidden = true;
      drawer.setAttribute("hidden", "");
      drawer.setAttribute("aria-hidden", "true");
      root.classList.remove("is-open");
      lockScroll(false);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };

    menuBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isHidden = drawer.hidden || drawer.hasAttribute("hidden");
      if (isHidden) openDrawer();
      else closeDrawer();
    });

    for (let i = 0; i < closeEls.length; i++) {
      closeEls[i].addEventListener("click", closeDrawer);
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDrawer();
    });

    // Announcement slider
    const bar = root.querySelector("[data-ab]");
    if (bar) {
      const track = bar.querySelector("[data-ab-track]");
      const slides = bar.querySelectorAll("[data-ab-slide]");
      const prevBtn = bar.querySelector("[data-ab-prev]");
      const nextBtn = bar.querySelector("[data-ab-next]");

      if (track && slides.length > 1) {
        let index = 0;
        let timer = null;
        const interval = Number(bar.getAttribute("data-interval") || 4000);

        const update = () => {
          track.style.transform = "translateX(-" + index * 100 + "%)";
        };

        const next = () => {
          index = (index + 1) % slides.length;
          update();
        };

        const prev = () => {
          index = (index - 1 + slides.length) % slides.length;
          update();
        };

        const stop = () => {
          if (timer) clearInterval(timer);
          timer = null;
        };

        const start = () => {
          stop();
          timer = setInterval(next, interval);
        };

        if (nextBtn) nextBtn.addEventListener("click", () => { next(); start(); });
        if (prevBtn) prevBtn.addEventListener("click", () => { prev(); start(); });

        bar.addEventListener("mouseenter", stop);
        bar.addEventListener("mouseleave", start);

        update();
        start();
      }
    }

    // Countdown(s)
    function pad2(n) {
      const s = String(n);
      return s.length >= 2 ? s : "0" + s;
    }

    function setCountdown(el) {
      const to = el.getAttribute("data-countdown-to");
      const target = new Date(to);
      if (isNaN(target.getTime())) {
        el.style.display = "none";
        return;
      }

      const diff = Math.max(0, target.getTime() - Date.now());
      const totalSec = Math.floor(diff / 1000);

      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;

      const dEl = el.querySelector("[data-cd-days]");
      const hEl = el.querySelector("[data-cd-hours]");
      const mEl = el.querySelector("[data-cd-mins]");
      const sEl = el.querySelector("[data-cd-secs]");

      if (dEl) dEl.textContent = String(days);
      if (hEl) hEl.textContent = pad2(hours);
      if (mEl) mEl.textContent = pad2(mins);
      if (sEl) sEl.textContent = pad2(secs);
    }

    const countdowns = root.querySelectorAll("[data-countdown]");
    if (countdowns.length) {
      for (let i = 0; i < countdowns.length; i++) setCountdown(countdowns[i]);
      setInterval(() => {
        for (let i = 0; i < countdowns.length; i++) setCountdown(countdowns[i]);
      }, 1000);
    }

    // Left categories -> right panel swap
    const catButtons = root.querySelectorAll("[data-hdr2-cat-btn]");
    const panels = root.querySelectorAll("[data-hdr2-panel]");

    function showPanel(id) {
      for (let i = 0; i < panels.length; i++) {
        panels[i].hidden = panels[i].getAttribute("data-panel") !== id;
      }
    }

    for (let i = 0; i < catButtons.length; i++) {
      const btn = catButtons[i];

      btn.addEventListener("mouseenter", () => {
        if (window.matchMedia("(min-width: 981px)").matches) {
          showPanel(btn.getAttribute("data-target"));
        }
      });

      btn.addEventListener("focus", () => {
        if (window.matchMedia("(min-width: 981px)").matches) {
          showPanel(btn.getAttribute("data-target"));
        }
      });

      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-target");
        const sub = document.getElementById(id);
        const expanded = btn.getAttribute("aria-expanded") === "true";

        btn.setAttribute("aria-expanded", expanded ? "false" : "true");
        if (sub) sub.hidden = expanded;

        if (window.matchMedia("(min-width: 981px)").matches) showPanel(id);
      });
    }

    // Accordion in drawer
    const accBtns = root.querySelectorAll("[data-hdr2-acc-btn]");
    for (let i = 0; i < accBtns.length; i++) {
      const btn = accBtns[i];
      btn.addEventListener("click", () => {
        const li = btn.closest("li");
        if (!li) return;
        const panel = li.querySelector(".hdr2__acc");
        if (!panel) return;

        const expanded = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", expanded ? "false" : "true");
        panel.hidden = expanded;
      });
    }

    // Localization auto-submit
    const locForm = document.getElementById("hdr2Localization");
    if (locForm) {
      const sel = locForm.querySelector("select");
      if (sel) sel.addEventListener("change", () => locForm.submit());
    }


/* assets/header-v3.js (UPDATED – ONLY show hovered category’s panel/children) */
/* Replace your existing mega block inside init(root) with this */

const mega = root.querySelector("[data-hdr2-mega]");
const megaTriggers = root.querySelectorAll("[data-hdr2-mega-trigger]");
const megaPanels = root.querySelectorAll("[data-hdr2-mega-panel]");

if (mega && megaTriggers.length && megaPanels.length) {
  let closeTimer = null;
  let opened = false;

  const showPanel = (id) => {
    for (let i = 0; i < megaPanels.length; i++) {
      const isMatch = megaPanels[i].getAttribute("data-panel") === id;
      megaPanels[i].hidden = !isMatch;              // <-- hide ALL others
    }
  };

  const openMega = (id, triggerEl) => {
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
    showPanel(id);

    mega.hidden = false;
    mega.classList.add("is-open");
    opened = true;

    for (let i = 0; i < megaTriggers.length; i++) {
      megaTriggers[i].setAttribute("aria-expanded", "false");
    }
    if (triggerEl) triggerEl.setAttribute("aria-expanded", "true");
  };

  const closeMega = () => {
    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      mega.classList.remove("is-open");
      mega.hidden = true;
      opened = false;

      for (let i = 0; i < megaTriggers.length; i++) {
        megaTriggers[i].setAttribute("aria-expanded", "false");
      }

      // optional: hide all panels on close
      for (let i = 0; i < megaPanels.length; i++) megaPanels[i].hidden = true;
    }, 120);
  };

  for (let i = 0; i < megaTriggers.length; i++) {
    const t = megaTriggers[i];

    t.addEventListener("mouseenter", () => {
      const id = t.getAttribute("data-target");
      openMega(id, t);
    });

    t.addEventListener("focus", () => {
      const id = t.getAttribute("data-target");
      openMega(id, t);
    });
  }

  mega.addEventListener("mouseenter", () => {
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
  });
  mega.addEventListener("mouseleave", closeMega);

  const catbar = root.querySelector("[data-hdr2-catbar]");
  if (catbar) catbar.addEventListener("mouseleave", closeMega);

  document.addEventListener("pointerdown", (e) => {
    if (!opened) return;
    if (root.contains(e.target)) return;
    closeMega();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMega();
  });
}



//toggle-theme
  const themeBtn = root.querySelector("[data-hdr2-theme]");

if (themeBtn) {
  // load saved
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") document.documentElement.classList.add("theme-dark");
    if (saved === "light") document.documentElement.classList.remove("theme-dark");
  } catch (e) {}

  themeBtn.addEventListener("click", () => {
    const isDark = document.documentElement.classList.toggle("theme-dark");
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch (e) {}
  });
}

/* Location modal */
const locOpen = root.querySelector("[data-hdr2-location-open]");
const locModal = document.querySelector("[data-locmodal]");
const locCloseEls = locModal ? locModal.querySelectorAll("[data-locmodal-close]") : [];

if (locOpen && locModal) {
  let lastFocus = null;

  const openLoc = () => {
    lastFocus = document.activeElement;
    locModal.hidden = false;
    locModal.removeAttribute("hidden");
    document.documentElement.style.overflow = "hidden";

    const first = locModal.querySelector(
      "button, a, input, select, textarea, [tabindex]:not([tabindex='-1'])"
    );
    if (first && first.focus) first.focus();
  };

  const closeLoc = () => {
    locModal.hidden = true;
    locModal.setAttribute("hidden", "");
    document.documentElement.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };

  locOpen.addEventListener("click", (e) => {
    e.preventDefault();
    openLoc();
  });

  for (let i = 0; i < locCloseEls.length; i++) {
    locCloseEls[i].addEventListener("click", closeLoc);
  }

  document.addEventListener("keydown", (e) => {
    if (!locModal.hidden && e.key === "Escape") closeLoc();
  });

  // store accordion
  const acc = locModal.querySelectorAll("[data-locmodal-acc]");
  for (let i = 0; i < acc.length; i++) {
    acc[i].addEventListener("click", () => {
      const store = acc[i].closest(".locmodal__store");
      if (!store) return;
      const body = store.querySelector(".locmodal__storebody");
      if (!body) return;

      const opened = !body.hidden;
      // close others
      for (let j = 0; j < acc.length; j++) {
        const s = acc[j].closest(".locmodal__store");
        const b = s ? s.querySelector(".locmodal__storebody") : null;
        if (b) b.hidden = true;
      }
      body.hidden = opened ? true : false;
    });
  }
}

  }

  function initAll() {
    const roots = document.querySelectorAll(ROOT_SELECTOR);
    for (let i = 0; i < roots.length; i++) init(roots[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }

  document.addEventListener("shopify:section:load", initAll);
  document.addEventListener("shopify:section:select", initAll);
})();