// Progressive enhancement:
// - Adds `.js` class to enable CSS behavior
// - Quantity +/- updates the number input and auto-submits the cart form

(function () {
    document.documentElement.classList.add('js');

    var form = document.querySelector('[data-cart-form]');
    if (!form) return;

    function clamp(n, min, max) {
    n = isNaN(n) ? min : n;
    if (typeof max === 'number') n = Math.min(n, max);
    return Math.max(n, min);
    }

    function submit() {
    // Use requestSubmit when available to preserve native form behavior
    if (form.requestSubmit) form.requestSubmit();
    else form.submit();
    }

    form.addEventListener('click', function (e) {
    var btnMinus = e.target.closest('[data-qty-minus]');
    var btnPlus  = e.target.closest('[data-qty-plus]');
    if (!btnMinus && !btnPlus) return;

    var item = e.target.closest('.cart-item');
    if (!item) return;

    var input = item.querySelector('[data-qty-input]');
    if (!input) return;

    var current = parseInt(input.value, 10);
    current = isNaN(current) ? 0 : current;

    if (btnMinus) current = current - 1;
    if (btnPlus)  current = current + 1;

    current = clamp(current, 0);
    input.value = current;

    // Auto submit (set to 0 removes item)
    submit();
    });

    form.addEventListener('change', function (e) {
    var input = e.target.closest('[data-qty-input]');
    if (!input) return;
    var v = parseInt(input.value, 10);
    input.value = clamp(v, 0);
    submit();
    });
})();