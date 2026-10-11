/* =========================================================
   Demo Café — customer menu (demo.js)  · v2
   - Live data from Firestore (onSnapshot → instant updates)
   - Works even when the network blocks Firestore streaming
     (automatic long-polling fallback)
   - If Firebase is not configured, runs in local demo mode
     (localStorage, shared with demoadmin.html in the same browser)
   ========================================================= */
(() => {
  'use strict';

  /* ---------- 1. CONFIG ---------- */
  // Same values as in demoadmin.js. If any character differs from your own
  // Firebase "Config" block, paste your original block here instead.
  const firebaseConfig = {
      apiKey: "AIzaSyC1SPZAUgQvkXrJpl2V8jXp4AEe7Q4BjKs",
  authDomain: "desing1-bd7c3.firebaseapp.com",
  projectId: "desing1-bd7c3",
  storageBucket: "desing1-bd7c3.firebasestorage.app",
  messagingSenderId: "243191786695",
  appId: "1:243191786695:web:2d56e5a33d7c5c6e15e2e2",
  };
  const FIREBASE_VERSION = '10.12.2';
  const COLLECTION = 'menuItems';
  const SERVER_TIMEOUT_MS = 12000;

  const LOCAL_KEY = 'demo_menu_items';
  const CART_KEY = 'demo_cart_v1';
  const LANG_KEY = 'demo_lang';
  const useFirebase = !!firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('YOUR_');

  /* ---------- 2. SECTIONS (keep identical to demoadmin.js) ---------- */
  const GROUPS = {
    food:   { ka: 'კერძები',    en: 'Food',   ru: 'Блюда' },
    drinks: { ka: 'სასმელები', en: 'Drinks', ru: 'Напитки' }
  };
  const SECTIONS = [
    { id: 'starters',    group: 'food',   emoji: '🧀', name: { ka: 'ცივი კერძები',          en: 'Starters',              ru: 'Закуски' } },
    { id: 'salads',      group: 'food',   emoji: '🥗', name: { ka: 'სალათები',              en: 'Salads',                ru: 'Салаты' } },
    { id: 'mains',       group: 'food',   emoji: '🍖', name: { ka: 'ცხელი კერძები',         en: 'Main Courses',          ru: 'Горячие блюда' } },
    { id: 'bakery',      group: 'food',   emoji: '🥟', name: { ka: 'ხაჭაპური და ხინკალი',   en: 'Khachapuri & Khinkali', ru: 'Хачапури и хинкали' } },
    { id: 'desserts',    group: 'food',   emoji: '🍰', name: { ka: 'დესერტები',             en: 'Desserts',              ru: 'Десерты' } },
    { id: 'hot-drinks',  group: 'drinks', emoji: '☕', name: { ka: 'ცხელი სასმელები',       en: 'Hot Drinks',            ru: 'Горячие напитки' } },
    { id: 'cold-drinks', group: 'drinks', emoji: '🍋', name: { ka: 'გრილი სასმელები',       en: 'Cold Drinks',           ru: 'Прохладительные напитки' } },
    { id: 'wine',        group: 'drinks', emoji: '🍷', name: { ka: 'ღვინო',                 en: 'Wine',                  ru: 'Вино' } },
    { id: 'cocktails',   group: 'drinks', emoji: '🍹', name: { ka: 'კოქტეილები',            en: 'Cocktails',             ru: 'Коктейли' } }
  ];
  const SEC = Object.fromEntries(SECTIONS.map(s => [s.id, s]));

  /* ---------- 3. TRANSLATIONS (all UI text) ---------- */
  const I18N = {
    ka: {
      heroSub: 'ტრადიციული გემოები · თბილი სტუმარმასპინძლობა',
      heroNote: 'აირჩიეთ სასურველი კერძი და დაამატეთ შეკვეთაში',
      langLabel: 'ენის არჩევა', navLabel: 'მენიუს სექციები',
      add: 'დამატება', added: 'დაემატა',
      cart: 'კალათა', cartTitle: 'თქვენი შეკვეთა', cartEmpty: 'კალათა ჯერ ცარიელია',
      cartHint: 'შეკვეთის გასაფორმებლად აჩვენეთ ეს სია ოფიციანტს.',
      total: 'ჯამი', clear: 'გასუფთავება', close: 'დახურვა', remove: 'წაშლა',
      bottle: 'ბოთლი', glass: 'ჭიქა',
      empty: 'მენიუ ჯერ ცარიელია', error: 'მენიუს ჩატვირთვა ვერ მოხერხდა. სცადეთ ხელახლა.',
      fThanks: 'გმადლობთ, რომ გვეწვიეთ! გემრიელად მიირთვით.',
      fAddrL: 'მისამართი', fAddr: 'რუსთაველის გამზ. 12, თბილისი',
      fHoursL: 'სამუშაო საათები', fHours: 'ყოველდღე 10:00 – 23:00',
      fPhoneL: 'ტელეფონი', fWifi: 'ქსელი: DemoCafe · პაროლი: welcome123',
      fNote: 'ფასები მითითებულია ლარებში (₾).'
    },
    en: {
      heroSub: 'Traditional flavours · Warm hospitality',
      heroNote: 'Pick your favourite dishes and add them to your order',
      langLabel: 'Choose language', navLabel: 'Menu sections',
      add: 'Add', added: 'Added',
      cart: 'Cart', cartTitle: 'Your order', cartEmpty: 'Your cart is empty',
      cartHint: 'Show this list to your waiter to place the order.',
      total: 'Total', clear: 'Clear', close: 'Close', remove: 'Remove',
      bottle: 'Bottle', glass: 'Glass',
      empty: 'The menu is empty for now', error: 'Could not load the menu. Please try again.',
      fThanks: 'Thank you for visiting! Enjoy your meal.',
      fAddrL: 'Address', fAddr: '12 Rustaveli Ave, Tbilisi',
      fHoursL: 'Opening hours', fHours: 'Daily 10:00 AM – 11:00 PM',
      fPhoneL: 'Phone', fWifi: 'Network: DemoCafe · Password: welcome123',
      fNote: 'All prices are in Georgian lari (₾).'
    },
    ru: {
      heroSub: 'Традиционные вкусы · Тёплое гостеприимство',
      heroNote: 'Выберите любимые блюда и добавьте их в заказ',
      langLabel: 'Выбор языка', navLabel: 'Разделы меню',
      add: 'Добавить', added: 'Добавлено',
      cart: 'Корзина', cartTitle: 'Ваш заказ', cartEmpty: 'Корзина пока пуста',
      cartHint: 'Покажите этот список официанту, чтобы оформить заказ.',
      total: 'Итого', clear: 'Очистить', close: 'Закрыть', remove: 'Удалить',
      bottle: 'Бутылка', glass: 'Бокал',
      empty: 'Меню пока пустое', error: 'Не удалось загрузить меню. Попробуйте ещё раз.',
      fThanks: 'Спасибо, что заглянули к нам! Приятного аппетита.',
      fAddrL: 'Адрес', fAddr: 'пр. Руставели, 12, Тбилиси',
      fHoursL: 'Часы работы', fHours: 'Ежедневно 10:00 – 23:00',
      fPhoneL: 'Телефон', fWifi: 'Сеть: DemoCafe · Пароль: welcome123',
      fNote: 'Все цены указаны в лари (₾).'
    }
  };

  /* ---------- 4. STATE & HELPERS ---------- */
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => { n = Math.round(Number(n) * 100) / 100; return Number.isInteger(n) ? String(n) : n.toFixed(2); };
  const safeImg = u => typeof u === 'string' && /^(https?:\/\/|data:image\/)/i.test(u);

  let lang = localStorage.getItem(LANG_KEY);
  if (!I18N[lang]) lang = 'ka';

  let items = [];
  let byId = {};
  let loaded = false;
  let failed = false;
  let firstPaint = true;
  let status = '';                  // small diagnostic line, shown only in empty / error states
  const variantSel = {};            // wine: selected variant per item id
  let cart = {};
  try { cart = JSON.parse(localStorage.getItem(CART_KEY) || '{}') || {}; } catch (_) { cart = {}; }

  const t = k => (I18N[lang] && I18N[lang][k]) || I18N.ka[k] || k;
  const L = obj => (obj && (obj[lang] || obj.ka || obj.en || obj.ru)) || '';
  const hasGlass = it => it.section === 'wine' && it.glassEnabled && Number(it.glassPrice) > 0;

  /* ---------- 5. STATIC TRANSLATION ---------- */
  function applyStatic() {
    document.documentElement.lang = lang;
    document.title = 'Demo Café';
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-label]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nLabel)));
    document.querySelectorAll('[data-lang]').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
  }

  /* ---------- 6. MENU RENDER ---------- */
  const menuEl = $('menu');
  const navEl = $('sectionNav');
  const statusHTML = () => (status ? `<p style="font-size:11px;opacity:.6;margin:8px 0 0">${esc(status)}</p>` : '');

  let io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -30px 0px', threshold: 0.05 });
  }

  function cardHTML(it, idx) {
    const sec = SEC[it.section];
    const glass = hasGlass(it);
    const isWine = it.section === 'wine';
    const variant = glass ? (variantSel[it.id] || 'bottle') : 'bottle';
    const img = it.image || it.imageUrl;
    const media = safeImg(img)
      ? `<img src="${esc(img)}" alt="${esc(L(it.name))}" loading="lazy">`
      : `<span class="card__emoji" aria-hidden="true">${sec.emoji}</span>`;

    const priceBlock = glass
      ? `<div class="seg" role="group">${['bottle', 'glass'].map(v =>
          `<button type="button" class="seg__btn${variant === v ? ' active' : ''}" data-variant="${v}">
             <small>${t(v)}</small><b>${fmt(v === 'glass' ? it.glassPrice : it.price)}<i>₾</i></b>
           </button>`).join('')}</div>`
      : `<div class="price">${isWine ? `<small>${t('bottle')}</small>` : ''}<b>${fmt(it.price)}</b><i>₾</i></div>`;

    return `
      <article class="card${firstPaint ? '' : ' in'}" data-id="${esc(it.id)}" style="--i:${idx % 2}">
        <div class="card__media">${media}</div>
        <div class="card__body">
          <h3 class="card__title">${esc(L(it.name))}</h3>
          <p class="card__desc">${esc(L(it.desc))}</p>
          <div class="card__foot">
            ${priceBlock}
            <button type="button" class="btn-add"><span class="plus">+</span><span class="lbl">${t('add')}</span></button>
          </div>
        </div>
      </article>`;
  }

  function renderMenu() {
    if (!loaded) {
      menuEl.innerHTML = `<div class="grid sk-grid">${'<div class="sk"></div>'.repeat(4)}</div>`;
      return;
    }
    if (failed) {
      menuEl.innerHTML = `<div class="state"><div class="big">⚠️</div><p>${t('error')}</p>${statusHTML()}</div>`;
      return;
    }
    if (!items.length) {
      menuEl.innerHTML = `<div class="state"><div class="big">🍽️</div><p>${t('empty')}</p>${statusHTML()}</div>`;
      return;
    }

    let html = '';
    let lastGroup = null;
    SECTIONS.forEach(sec => {
      const list = items.filter(i => i.section === sec.id);
      if (!list.length) return;
      if (sec.group !== lastGroup) {
        html += `<h2 class="group-title">${GROUPS[sec.group][lang]}</h2>`;
        lastGroup = sec.group;
      }
      html += `<section class="menu-section" id="sec-${sec.id}">
        <h3 class="section-title"><span class="e">${sec.emoji}</span>${esc(sec.name[lang])}</h3>
        <div class="grid">${list.map((it, i) => cardHTML(it, i)).join('')}</div>
      </section>`;
    });
    menuEl.innerHTML = html;

    menuEl.querySelectorAll('.card:not(.in)').forEach(c => (io ? io.observe(c) : c.classList.add('in')));
    firstPaint = false;
  }

  function renderNav() {
    if (!loaded || failed) { navEl.innerHTML = ''; navEl.hidden = true; return; }
    const present = SECTIONS.filter(s => items.some(i => i.section === s.id));
    navEl.hidden = !present.length;
    let html = '';
    present.forEach((s, i) => {
      if (i && present[i - 1].group !== s.group) html += '<span class="chip-sep"></span>';
      html += `<button type="button" class="chip" data-sec="${s.id}"><span class="e">${s.emoji}</span>${esc(s.name[lang])}</button>`;
    });
    navEl.innerHTML = html;
    spyCurrent = null;
    updateSpy();
  }

  /* Tap on a chip → smooth scroll to the section */
  navEl.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const target = $('sec-' + chip.dataset.sec);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveChip(chip.dataset.sec);
  });

  function setActiveChip(id) {
    let active = null;
    navEl.querySelectorAll('.chip').forEach(c => {
      const on = c.dataset.sec === id;
      c.classList.toggle('active', on);
      if (on) active = c;
    });
    if (active) {
      const left = active.offsetLeft - (navEl.clientWidth - active.clientWidth) / 2;
      navEl.scrollTo({ left, behavior: 'smooth' });
    }
  }

  /* Scroll-spy: highlight the chip of the section currently on screen */
  let spyTicking = false;
  let spyCurrent = null;
  function updateSpy() {
    const secs = menuEl.querySelectorAll('.menu-section');
    if (!secs.length) return;
    const line = navEl.offsetHeight + 40;
    let current = secs[0].id.slice(4);
    secs.forEach(s => { if (s.getBoundingClientRect().top <= line) current = s.id.slice(4); });
    if (current !== spyCurrent) {
      spyCurrent = current;
      setActiveChip(current);
    }
  }
  window.addEventListener('scroll', () => {
    if (spyTicking) return;
    spyTicking = true;
    requestAnimationFrame(() => { updateSpy(); spyTicking = false; });
  }, { passive: true });

  /* Card interactions (event delegation) */
  menuEl.addEventListener('click', e => {
    const card = e.target.closest('.card');
    if (!card) return;
    const id = card.dataset.id;

    const seg = e.target.closest('[data-variant]');
    if (seg) {
      variantSel[id] = seg.dataset.variant;
      card.querySelectorAll('[data-variant]').forEach(b => b.classList.toggle('active', b === seg));
      return;
    }
    const addBtn = e.target.closest('.btn-add');
    if (addBtn) { addToCart(id, variantSel[id] || 'bottle', addBtn); return; }

    const desc = e.target.closest('.card__desc');
    if (desc) desc.classList.toggle('expanded');
  });

  /* ---------- 7. CART ---------- */
  const sheet = $('cartSheet');
  const toastEl = $('toast');
  let toastTimer;

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1600);
  }
  const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (_) {} };

  function cartLines() {
    const out = [];
    Object.entries(cart).forEach(([key, qty]) => {
      const [id, variant] = key.split('|');
      const it = byId[id];
      if (!it || qty < 1) return;
      if (variant === 'glass' && !hasGlass(it)) return;
      const unit = Number(variant === 'glass' ? it.glassPrice : it.price);
      out.push({ key, it, variant, qty, unit, line: unit * qty });
    });
    return out;
  }

  function addToCart(id, variant, btn) {
    const it = byId[id];
    if (!it) return;
    if (variant === 'glass' && !hasGlass(it)) variant = 'bottle';
    const key = id + '|' + variant;
    cart[key] = (cart[key] || 0) + 1;
    saveCart();
    refreshCart();

    const fab = $('cartBtn');
    fab.classList.remove('bump'); void fab.offsetWidth; fab.classList.add('bump');
    toast(`${t('added')}: ${L(it.name)}`);

    if (btn) {
      btn.classList.add('ok');
      btn.querySelector('.plus').textContent = '✓';
      clearTimeout(btn._t);
      btn._t = setTimeout(() => { btn.classList.remove('ok'); btn.querySelector('.plus').textContent = '+'; }, 900);
    }
  }

  function refreshCart() {
    const lines = cartLines();
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const total = lines.reduce((s, l) => s + l.line, 0);
    $('cartCount').textContent = count;
    $('cartTotalFab').textContent = fmt(total) + ' ₾';
    $('cartTotal').textContent = fmt(total) + ' ₾';
    $('cartFoot').hidden = !lines.length;

    const body = $('cartBody');
    if (!lines.length) {
      body.innerHTML = `<div class="cart-empty"><div>🧺</div><p>${t('cartEmpty')}</p></div>`;
      return;
    }
    body.innerHTML = lines.map(l => {
      const sub = l.it.section === 'wine' ? `${t(l.variant)} · ${fmt(l.unit)} ₾` : `${fmt(l.unit)} ₾`;
      return `<div class="cart-row" data-key="${esc(l.key)}">
        <div>
          <div class="cart-row__name">${esc(L(l.it.name))}</div>
          <div class="cart-row__sub">${sub}</div>
        </div>
        <div class="cart-row__sum">${fmt(l.line)} ₾</div>
        <div class="qty">
          <button type="button" data-act="dec" aria-label="−">−</button>
          <span>${l.qty}</span>
          <button type="button" data-act="inc" aria-label="+">+</button>
          <button type="button" class="rm" data-act="rm" aria-label="${t('remove')}">✕</button>
        </div>
      </div>`;
    }).join('');
  }

  $('cartBody').addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    const row = e.target.closest('.cart-row');
    if (!btn || !row) return;
    const key = row.dataset.key;
    if (btn.dataset.act === 'inc') cart[key] = (cart[key] || 0) + 1;
    if (btn.dataset.act === 'dec') cart[key] = (cart[key] || 0) - 1;
    if (btn.dataset.act === 'rm') cart[key] = 0;
    if (cart[key] <= 0) delete cart[key];
    saveCart();
    refreshCart();
  });

  function openCart() { refreshCart(); sheet.classList.add('open'); sheet.setAttribute('aria-hidden', 'false'); document.body.classList.add('lock'); }
  function closeCart() { sheet.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true'); document.body.classList.remove('lock'); }

  $('cartBtn').addEventListener('click', openCart);
  $('cartClose').addEventListener('click', closeCart);
  $('cartDone').addEventListener('click', closeCart);
  $('cartClear').addEventListener('click', () => { cart = {}; saveCart(); refreshCart(); });
  sheet.addEventListener('click', e => { if (e.target === sheet) closeCart(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCart(); });

  /* ---------- 8. LANGUAGE SWITCH ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-lang]');
    if (!b || b.dataset.lang === lang) return;
    lang = b.dataset.lang;
    localStorage.setItem(LANG_KEY, lang);
    renderAll();
  });

  function renderAll() {
    try {
      applyStatic();
      renderMenu();
      renderNav();
      refreshCart();
    } catch (err) {
      console.error('Render error:', err);
      status = 'render error: ' + err.message;
      loaded = true; failed = true;
      try { renderMenu(); } catch (_) {}
    }
  }

  /* ---------- 9. DATA ---------- */
  function setItems(list) {
    // Same rule as the admin panel: an item is visible unless active === false
    items = list
      .filter(i => i && i.active !== false && SEC[i.section])
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    byId = Object.fromEntries(items.map(i => [i.id, i]));
    loaded = true;
    failed = false;
    renderAll();
  }
  function setError(msg) {
    status = msg || status;
    loaded = true;
    failed = true;
    renderAll();
  }

  async function startFirebase() {
    const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
    const [{ initializeApp }, fs] = await Promise.all([
      import(`${base}/firebase-app.js`),
      import(`${base}/firebase-firestore.js`)
    ]);
    const app = initializeApp(firebaseConfig);
    // Auto-detect long-polling: fixes "stuck loading" on networks / extensions that block streaming
    const db = fs.initializeFirestore(app, { experimentalAutoDetectLongPolling: true });

    fs.onSnapshot(fs.collection(db, COLLECTION),
      snap => {
        // Empty answer that came only from the local cache = no server connection yet → keep waiting
        if (snap.empty && snap.metadata.fromCache) {
          status = 'Firestore: waiting for server connection…';
          return;
        }
        status = `Firestore · ${firebaseConfig.projectId} · docs: ${snap.size}${snap.metadata.fromCache ? ' (cache)' : ''}`;
        setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      err => {
        console.error('FIRESTORE ERROR:', err.code, err.message);
        setError(`Firestore error: ${err.code || err.message}`);
      });
  }

  function startLocal() {
    const read = () => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch (_) { return []; } };
    status = `local mode · docs: ${read().length}`;
    setItems(read());
    window.addEventListener('storage', e => { if (e.key === LOCAL_KEY) setItems(read()); });
  }

  /* ---------- 10. INIT ---------- */
  $('year').textContent = new Date().getFullYear();
  renderAll();                       // skeleton + static texts right away
  console.log('Menu mode:', useFirebase ? 'Firestore (' + firebaseConfig.projectId + ')' : 'local demo');

  if (useFirebase) {
    startFirebase().catch(err => {
      console.error(err);
      setError('init error: ' + (err && err.message ? err.message : err));
    });
    setTimeout(() => {
      if (!loaded) setError('no response from the Firestore server (database missing, blocked connection, or rules)');
    }, SERVER_TIMEOUT_MS);
  } else {
    startLocal();
  }
})();