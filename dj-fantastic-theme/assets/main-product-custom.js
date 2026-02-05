  (function(){
    const root = document.querySelector('[data-pdp]');
    if(!root) return;

    // coupon close
    const coupon = root.querySelector('[data-coupon]');
    const couponClose = root.querySelector('[data-coupon-close]');
    if(coupon && couponClose) couponClose.addEventListener('click', () => coupon.remove());

    // qty
    const qty = root.querySelector('[data-qty]');
    const inc = root.querySelector('[data-qty-inc]');
    const dec = root.querySelector('[data-qty-dec]');
    if(qty && inc && dec){
      inc.addEventListener('click', () => qty.value = String(Math.max(1, (parseInt(qty.value||'1',10)+1))));
      dec.addEventListener('click', () => qty.value = String(Math.max(1, (parseInt(qty.value||'1',10)-1))));
    }

    // media
    const media = JSON.parse(root.querySelector('[data-media-json]').textContent || '[]');
    const panes = [root.querySelector('[data-pane="0"]'), root.querySelector('[data-pane="1"]')];
    const thumbs = Array.from(root.querySelectorAll('[data-thumb]'));

    function renderPane(el, item){
      if(!el || !item) return;
      // images only for now (matches your screenshots)
      el.innerHTML = `<img src="${item.full}" alt="${(item.alt||'').replace(/"/g,'&quot;')}" loading="eager">`;
    }

    function setActive(id){
      const idx = media.findIndex(x => String(x.id) === String(id));
      if(idx < 0) return;
      const next = (idx + 1) % media.length;
      renderPane(panes[0], media[idx]);
      renderPane(panes[1], media[next]);
      thumbs.forEach(t => t.setAttribute('aria-current', (t.dataset.mediaId === String(id)) ? 'true' : 'false'));
    }

    if(media[0]) setActive(media[0].id);
    thumbs.forEach(t => t.addEventListener('click', () => setActive(t.dataset.mediaId)));

    // variants
    const variants = JSON.parse(root.querySelector('[data-variants-json]').textContent || '[]');
    const variantSelect = root.querySelector('[data-variant-select]');
    const variantId = root.querySelector('[data-variant-id]');
    const priceEl = root.querySelector('[data-price]');
    const compareEl = root.querySelector('[data-compare]');
    const buyNow = root.querySelector('[data-buy-now]');

    function money(cents){
      // simple; Shopify formatting can differ, but good enough for swapping
      return (cents/100).toLocaleString(undefined,{style:'currency',currency:'{{ shop.currency }}'});
    }

    function applyVariant(id){
      const v = variants.find(x => String(x.id) === String(id));
      if(!v) return;
      if(variantId) variantId.value = v.id;
      if(priceEl) priceEl.textContent = money(v.price);

      if(compareEl){
        if(v.compare_at_price && v.compare_at_price > v.price){
          compareEl.textContent = money(v.compare_at_price);
          compareEl.style.display = '';
        } else {
          compareEl.style.display = 'none';
        }
      }
      if(buyNow) buyNow.disabled = !v.available;
    }

    if(variantSelect){
      variantSelect.addEventListener('change', (e) => applyVariant(e.target.value));
    }

    // Buy now -> checkout
    if(buyNow){
      buyNow.addEventListener('click', async () => {
        const id = variantSelect ? variantSelect.value : (variantId ? variantId.value : null);
        const q = qty ? parseInt(qty.value||'1',10) : 1;
        if(!id) return;
        try{
          await fetch('/cart/clear.js', {method:'POST'});
          await fetch('/cart/add.js', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({items:[{id:Number(id), quantity:q}]})
          });
          window.location.href = '/checkout';
        }catch(e){
          window.location.href = '/cart';
        }
      });
    }
  })();