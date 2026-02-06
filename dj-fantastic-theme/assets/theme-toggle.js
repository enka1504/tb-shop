/* assets/theme-toggle.js (UPDATED – global theme toggle for whole project) */
(() => {
  const STORAGE_KEY = "theme";

  const apply = (mode) => {
    if (mode === "dark") document.documentElement.classList.add("theme-dark");
    else document.documentElement.classList.remove("theme-dark");
  };

  // initial load
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") apply(saved);
    else {
      // optional: follow OS default if nothing saved
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      apply(prefersDark ? "dark" : "light");
    }
  } catch (e) {}

  // expose global function for any button
  window.toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle("theme-dark");
    try { localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light"); } catch (e) {}
    return isDark ? "dark" : "light";
  };

  // auto-bind: any element with [data-theme-toggle]
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-theme-toggle]");
    if (!btn) return;
    e.preventDefault();
    window.toggleTheme();
  });
})();