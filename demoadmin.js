/* =========================================================
   Demo Café — manager admin panel (demoadmin.js)

   SETUP (Firebase, free Spark plan)
   1. console.firebase.google.com → create project → add a Web app → paste config below
      (the SAME config must be pasted in demo.js)
   2. Build → Firestore Database → create database
   3. Build → Authentication → enable "Email/Password" → add ONE manager user
      (Users tab → Add user) and copy that user's UID
   4. Firestore → Rules (replace MANAGER_UID with the UID from step 3):

      rules_version = '2';
      service cloud.firestore {
        match /databases/{db}/documents {
          match /menuItems/{id} {
            allow read: if true;
            allow write: if request.auth != null && request.auth.uid == 'MANAGER_UID';
          }
        }
      }

      (Checking the UID matters: without it anyone could self-register through
       the public web config and edit the menu.)
   5. Authentication → Settings → Authorized domains: add your hosting domain.

   Until the config is filled in, the panel runs in LOCAL DEMO MODE
   (localStorage) — demo.html in the same browser updates instantly too.
   ========================================================= */
(() => {
  'use strict';

  /* ---------- 1. CONFIG ---------- */
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
  const LOCAL_KEY = 'demo_menu_items';
  const useFirebase = !!firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('YOUR_');

  /* ---------- 2. SECTIONS (keep identical to demo.js) ---------- */
  const GROUP_LABEL = { food: 'კერძები', drinks: 'სასმელები' };
  const SECTIONS = [
    { id: 'starters',    group: 'food',   emoji: '🧀', ka: 'ცივი კერძები' },
    { id: 'salads',      group: 'food',   emoji: '🥗', ka: 'სალათები' },
    { id: 'mains',       group: 'food',   emoji: '🍖', ka: 'ცხელი კერძები' },
    { id: 'bakery',      group: 'food',   emoji: '🥟', ka: 'ხაჭაპური და ხინკალი' },
    { id: 'desserts',    group: 'food',   emoji: '🍰', ka: 'დესერტები' },
    { id: 'hot-drinks',  group: 'drinks', emoji: '☕', ka: 'ცხელი სასმელები' },
    { id: 'cold-drinks', group: 'drinks', emoji: '🍋', ka: 'გრილი სასმელები' },
    { id: 'wine',        group: 'drinks', emoji: '🍷', ka: 'ღვინო' },
    { id: 'cocktails',   group: 'drinks', emoji: '🍹', ka: 'კოქტეილები' }
  ];
  const SEC = Object.fromEntries(SECTIONS.map(s => [s.id, s]));
  const SEC_ORDER = Object.fromEntries(SECTIONS.map((s, i) => [s.id, i]));

  /* ---------- 3. DEMO DATA (15 dishes) ---------- */
  const mk = (section, ka, en, ru, dka, den, dru, price, glassPrice) => ({
    section,
    name: { ka, en, ru },
    desc: { ka: dka, en: den, ru: dru },
    price,
    glassEnabled: glassPrice != null,
    glassPrice: glassPrice != null ? glassPrice : null,
    imageUrl: '', image: '',
    active: true
  });
  const SEED = [
    mk('starters', 'ქართული ყველის ასორტი', 'Georgian Cheese Platter', 'Ассорти грузинских сыров',
      'სულგუნი, იმერული და გომის ყველი თაფლითა და ნიგვზით', 'Sulguni, Imeruli and Gomi cheese served with honey and walnuts', 'Сулугуни, имеретинский и гоми с мёдом и грецкими орехами', 24),
    mk('starters', 'ბადრიჯანი ნიგვზით', 'Eggplant with Walnut Spread', 'Баклажаны с ореховой пастой',
      'შებოლილი ბადრიჯანი, ნიგვზის პასტა და ბროწეულის მარცვლები', 'Grilled eggplant rolls with walnut paste and pomegranate seeds', 'Жареные баклажаны с ореховой пастой и зёрнами граната', 16),
    mk('salads', 'ქართული სალათი', 'Georgian Salad', 'Грузинский салат',
      'ახალი პომიდორი, კიტრი, წითელი ხახვი და ნიგვზის ზეთი', 'Fresh tomatoes, cucumbers and red onion with walnut oil', 'Свежие помидоры, огурцы и красный лук с ореховым маслом', 14),
    mk('salads', 'ცეზარი ქათმით', 'Chicken Caesar', 'Цезарь с курицей',
      'რომენის სალათი, ქათმის ფილე, პარმეზანი და კრუტონები', 'Romaine lettuce, grilled chicken, parmesan and croutons', 'Салат романо, куриное филе, пармезан и сухарики', 22),
    mk('mains', 'ჩაქაფული', 'Chakapuli', 'Чакапули',
      'ბატკნის ხორცი ტარხუნთან, ტყემალთან და თეთრ ღვინოსთან ერთად', 'Tender lamb stewed with tarragon, sour plums and white wine', 'Нежная ягнятина с тархуном, кислой сливой и белым вином', 38),
    mk('mains', 'ქათმის ტაბაკა', 'Chicken Tabaka', 'Цыплёнок табака',
      'ტაფაზე შემწვარი ქათამი ნიორითა და ტყემლის სოუსით', 'Pan-pressed spring chicken with garlic and tkemali sauce', 'Цыплёнок, обжаренный под прессом, с чесноком и соусом ткемали', 32),
    mk('bakery', 'იმერული ხაჭაპური', 'Imeruli Khachapuri', 'Имеретинский хачапури',
      'ცხელი, რბილი ცომი იმერული ყველით', 'Warm soft dough filled with Imeruli cheese', 'Тёплое мягкое тесто с имеретинским сыром', 15),
    mk('bakery', 'ხინკალი (5 ცალი)', 'Khinkali (5 pcs)', 'Хинкали (5 шт.)',
      'წვნიანი ხინკალი ძროხისა და ღორის ხორცით', 'Juicy dumplings filled with beef and pork in spiced broth', 'Сочные хинкали с говядиной и свининой', 17),
    mk('desserts', 'მედოვიკი', 'Honey Cake', 'Медовик',
      'თხელი თაფლის ფენები და ნაზი არაჟნის კრემი', 'Thin honey layers with delicate sour-cream frosting', 'Тонкие медовые коржи с нежным сметанным кремом', 12),
    mk('desserts', 'ტირამისუ', 'Tiramisu', 'Тирамису',
      'მასკარპონეს კრემი, ესპრესო და კაკაო', 'Mascarpone cream, espresso-soaked biscuits and cocoa', 'Крем маскарпоне, эспрессо и какао', 13),
    mk('hot-drinks', 'ყავა ლატე', 'Caffè Latte', 'Кофе латте',
      'ესპრესო და ნაზად დაორთქლილი რძე', 'Espresso with gently steamed milk', 'Эспрессо с нежно взбитым молоком', 8),
    mk('cold-drinks', 'სახლის ლიმონათი', 'Homemade Lemonade', 'Домашний лимонад',
      'ახალი ლიმონი, პიტნა და ხილის სიროფი', 'Fresh lemon, mint and fruit syrup', 'Свежий лимон, мята и фруктовый сироп', 9),
    mk('wine', 'საფერავი (ქვევრი)', 'Saperavi (Qvevri)', 'Саперави (квеври)',
      'ღრმა წითელი ღვინო მუქი ხილისა და სანელებლების არომატით', 'Deep red wine with notes of dark fruit and spice', 'Глубокое красное вино с нотами тёмных фруктов и специй', 60, 12),
    mk('wine', 'რქაწითელი (ქვევრი)', 'Rkatsiteli (Qvevri)', 'Ркацители (квеври)',
      'ქარვისფერი ღვინო ხმელი ხილისა და თაფლის ნოტებით', 'Amber wine with notes of dried fruit and honey', 'Янтарное вино с нотами сухофруктов и мёда', 55),
    mk('cocktails', 'აპეროლ შპრიცი', 'Aperol Spritz', 'Апероль шприц',
      'აპეროლი, პროსეკო, სოდა და ფორთოხალი', 'Aperol, prosecco, soda and orange', 'Апероль, просекко, содовая и апельсин', 18)
  ];

  /* ---------- 4. DATA LAYER ---------- */
  async function createFirebaseStore() {
    const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
    const [appM, fs, authM] = await Promise.all([
      import(`${base}/firebase-app.js`),
      import(`${base}/firebase-firestore.js`),
      import(`${base}/firebase-auth.js`)
    ]);
    const app = appM.initializeApp(firebaseConfig);
    const db = fs.getFirestore(app);
    const auth = authM.getAuth(app);
    const col = fs.collection(db, COLLECTION);
    return {
      mode: 'firebase',
      onAuth: cb => authM.onAuthStateChanged(auth, cb),
      login: (email, pass) => authM.signInWithEmailAndPassword(auth, email, pass),
      logout: () => authM.signOut(auth),
      subscribe: (cb, onErr) => fs.onSnapshot(col, snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))), onErr),
      add: data => fs.addDoc(col, { ...data, createdAt: Date.now() }),
      update: (id, data) => fs.updateDoc(fs.doc(db, COLLECTION, id), data),
      remove: id => fs.deleteDoc(fs.doc(db, COLLECTION, id)),
      seed: async list => {
        const batch = fs.writeBatch(db);
        const now = Date.now();
        list.forEach((x, i) => batch.set(fs.doc(col), { ...x, createdAt: now + i }));
        await batch.commit();
      }
    };
  }

  function createLocalStore() {
    const subs = new Set();
    const read = () => { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch (_) { return []; } };
    const write = arr => { localStorage.setItem(LOCAL_KEY, JSON.stringify(arr)); subs.forEach(f => f(read())); };
    const uid = () => 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    return {
      mode: 'local',
      onAuth: cb => { setTimeout(() => cb({ local: true }), 0); return () => {}; },
      login: async () => {},
      logout: async () => {},
      subscribe: cb => { subs.add(cb); cb(read()); return () => subs.delete(cb); },
      add: async data => { const a = read(); a.push({ ...data, id: uid(), createdAt: Date.now() }); write(a); },
      update: async (id, data) => write(read().map(x => (x.id === id ? { ...x, ...data } : x))),
      remove: async id => write(read().filter(x => x.id !== id)),
      seed: async list => {
        const a = read(); const now = Date.now();
        list.forEach((x, i) => a.push({ ...x, id: uid(), createdAt: now + i }));
        write(a);
      }
    };
  }

  /* ---------- 5. HELPERS ---------- */
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeImg = u => typeof u === 'string' && /^(https?:\/\/|data:image\/)/i.test(u);
  const fmtIn = n => (n === null || n === undefined || n === '' ? '' : String(Math.round(Number(n) * 100) / 100));

  let store = null;
  let unsub = null;
  let items = [];
  let editingId = null;
  let photoData = '';

  const toastEl = $('toast');
  let toastTimer;
  function toast(msg, isErr) {
    toastEl.textContent = msg;
    toastEl.classList.toggle('err', !!isErr);
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), isErr ? 3600 : 1800);
  }

  /* ---------- 6. TABS ---------- */
  function showTab(name) {
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    $('tab-list').hidden = name !== 'list';
    $('tab-form').hidden = name !== 'form';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.tab === 'form' && !editingId) resetForm();
    showTab(b.dataset.tab);
  }));

  /* ---------- 7. SECTION SELECTS ---------- */
  function optionsHTML(withAll) {
    let html = withAll ? '<option value="">ყველა სექცია</option>' : '';
    ['food', 'drinks'].forEach(g => {
      html += `<optgroup label="${GROUP_LABEL[g]}">` +
        SECTIONS.filter(s => s.group === g).map(s => `<option value="${s.id}">${s.emoji} ${s.ka}</option>`).join('') +
        '</optgroup>';
    });
    return html;
  }
  $('fSection').innerHTML = optionsHTML(false);
  $('filterSection').innerHTML = optionsHTML(true);

  /* ---------- 8. LIST ---------- */
  function renderList() {
    const q = $('search').value.trim().toLowerCase();
    const sec = $('filterSection').value;

    $('countBadge').textContent = items.length;
    $('seedBox').hidden = items.length > 0;

    const rows = items
      .filter(i => !sec || i.section === sec)
      .filter(i => !q || ['ka', 'en', 'ru'].some(l => (i.name?.[l] || '').toLowerCase().includes(q)))
      .sort((a, b) => (SEC_ORDER[a.section] - SEC_ORDER[b.section]) || ((a.createdAt || 0) - (b.createdAt || 0)));

    if (!rows.length) {
      $('list').innerHTML = items.length ? '<div class="empty">ვერაფერი მოიძებნა</div>' : '';
      return;
    }

    $('list').innerHTML = rows.map(it => {
      const s = SEC[it.section] || { emoji: '🍽️', ka: '—' };
      const stopped = it.active === false;
      const glass = it.section === 'wine' && it.glassEnabled;
      const img = it.image || it.imageUrl;
      const thumb = safeImg(img) ? `<img src="${esc(img)}" alt="">` : s.emoji;
      const priceLabel = it.section === 'wine' ? 'ბოთლი ₾' : 'ფასი ₾';
      return `
      <article class="row${stopped ? ' is-stopped' : ''}" data-id="${esc(it.id)}">
        <div class="row__thumb">${thumb}</div>
        <div class="row__main">
          <div class="row__name">${esc(it.name?.ka || '—')}</div>
          <div class="row__sub">${esc(it.name?.en || '')} · ${esc(it.name?.ru || '')}</div>
          <div class="badges">
            <span class="badge">${s.emoji} ${s.ka}</span>
            ${glass ? '<span class="badge badge--wine">ჭიქითაც</span>' : ''}
            ${stopped ? '<span class="badge badge--stop">სტოპი</span>' : ''}
          </div>
        </div>
        <div class="row__prices">
          <label class="price-in">${priceLabel}
            <input type="number" min="0" step="0.5" inputmode="decimal" data-price value="${fmtIn(it.price)}">
          </label>
          ${glass ? `<label class="price-in">ჭიქა ₾
            <input type="number" min="0" step="0.5" inputmode="decimal" data-glass value="${fmtIn(it.glassPrice)}">
          </label>` : ''}
        </div>
        <div class="row__actions">
          <label class="switch-line" style="margin:0" title="ჩართვა / სტოპი">
            <span class="switch"><input type="checkbox" data-active ${stopped ? '' : 'checked'}><span class="switch__knob"></span></span>
            <span class="sw-label">${stopped ? 'სტოპი' : 'ჩანს'}</span>
          </label>
          <span class="act">
            <button type="button" class="icon-btn" data-edit title="რედაქტირება">✎</button>
            <button type="button" class="icon-btn danger" data-del title="წაშლა">🗑</button>
          </span>
        </div>
      </article>`;
    }).join('');
  }
  $('search').addEventListener('input', renderList);
  $('filterSection').addEventListener('change', renderList);

  const findItem = id => items.find(i => i.id === id);
  const fail = err => { console.error(err); toast('ვერ შეინახა. შეამოწმეთ კავშირი ან Firestore Rules.', true); };

  $('list').addEventListener('change', async e => {
    const row = e.target.closest('.row');
    if (!row) return;
    const it = findItem(row.dataset.id);
    if (!it) return;

    try {
      if (e.target.matches('[data-active]')) {
        await store.update(it.id, { active: e.target.checked });
        toast(e.target.checked ? 'კერძი მენიუში ჩანს' : 'კერძი სტოპშია — მენიუდან გაქრა');
        return;
      }
      if (e.target.matches('[data-price], [data-glass]')) {
        const isGlass = e.target.matches('[data-glass]');
        const val = parseFloat(String(e.target.value).replace(',', '.'));
        if (!isFinite(val) || val < 0 || (isGlass && val <= 0)) {
          toast('ფასი არასწორია', true);
          e.target.value = fmtIn(isGlass ? it.glassPrice : it.price);
          return;
        }
        await store.update(it.id, isGlass ? { glassPrice: val } : { price: val });
        e.target.classList.add('saved');
        setTimeout(() => e.target.classList.remove('saved'), 1200);
        toast('ფასი განახლდა');
      }
    } catch (err) { fail(err); renderList(); }
  });

  $('list').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches('.price-in input')) e.target.blur();
  });

  $('list').addEventListener('click', async e => {
    const row = e.target.closest('.row');
    if (!row) return;
    const it = findItem(row.dataset.id);
    if (!it) return;

    if (e.target.closest('[data-edit]')) { fillForm(it); showTab('form'); return; }
    if (e.target.closest('[data-del]')) {
      if (!confirm(`წაიშალოს „${it.name?.ka || ''}“?`)) return;
      try { await store.remove(it.id); toast('კერძი წაიშალა'); } catch (err) { fail(err); }
    }
  });

  $('seedBtn').addEventListener('click', async () => {
    $('seedBtn').disabled = true;
    try { await store.seed(SEED); toast('15 დემო კერძი დაემატა'); } catch (err) { fail(err); }
    $('seedBtn').disabled = false;
  });

  /* ---------- 9. FORM ---------- */
  const F = {
    section: $('fSection'),
    nameKa: $('fNameKa'), descKa: $('fDescKa'),
    nameEn: $('fNameEn'), nameRu: $('fNameRu'),
    descEn: $('fDescEn'), descRu: $('fDescRu'),
    price: $('fPrice'), glassOn: $('fGlassOn'), glassPrice: $('fGlassPrice'),
    active: $('fActive')
  };
  const TR = { name: { en: F.nameEn, ru: F.nameRu }, desc: { en: F.descEn, ru: F.descRu } };
  const SRC = { name: F.nameKa, desc: F.descKa };

  let touched = {};     // fields the manager edited by hand → never overwritten
  const timers = {}, pending = {}, inflight = {}, seq = {};

  function toggleWine() {
    const wine = F.section.value === 'wine';
    $('glassBox').hidden = !wine;
    $('priceLabel').textContent = wine ? 'ბოთლის ფასი (₾)' : 'ფასი (₾)';
    $('glassPriceWrap').hidden = !(wine && F.glassOn.checked);
  }
  F.section.addEventListener('change', toggleWine);
  F.glassOn.addEventListener('change', toggleWine);

  function setStatus(msg, cls) {
    const el = $('trStatus');
    el.textContent = msg;
    el.className = 'status' + (cls ? ' ' + cls : '');
  }

  function setPhoto(dataUrl) {
    photoData = dataUrl || '';
    $('photoPreview').innerHTML = photoData ? `<img src="${esc(photoData)}" alt="">` : 'არ არის';
    $('photoRemove').hidden = !photoData;
  }

  function resetForm() {
    editingId = null;
    $('dishForm').reset();
    F.active.checked = true;
    touched = {};
    Object.keys(timers).forEach(k => { clearTimeout(timers[k]); pending[k] = false; });
    setPhoto('');
    setStatus('ქართულად ჩაწერისას თარგმანი ავტომატურად შეივსება. საჭიროების შემთხვევაში შეგიძლიათ შეასწოროთ.');
    $('formTitle').textContent = 'ახალი კერძის დამატება';
    $('tabFormBtn').textContent = '+ ახალი კერძი';
    toggleWine();
  }

  function fillForm(it) {
    resetForm();
    editingId = it.id;
    F.section.value = it.section;
    F.nameKa.value = it.name?.ka || '';
    F.descKa.value = it.desc?.ka || '';
    F.nameEn.value = it.name?.en || '';
    F.nameRu.value = it.name?.ru || '';
    F.descEn.value = it.desc?.en || '';
    F.descRu.value = it.desc?.ru || '';
    F.price.value = fmtIn(it.price);
    F.glassOn.checked = !!it.glassEnabled;
    F.glassPrice.value = fmtIn(it.glassPrice);
    F.active.checked = it.active !== false;
    setPhoto(it.image || (safeImg(it.imageUrl) ? it.imageUrl : ''));
    $('formTitle').textContent = 'კერძის რედაქტირება';
    $('tabFormBtn').textContent = '✎ რედაქტირება';
    toggleWine();
  }

  $('cancelBtn').addEventListener('click', () => { resetForm(); showTab('list'); });

  /* --- Auto-translation (ka → en, ru) --- */
  const decode = s => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; };

  async function translateText(text, to) {
    text = text.trim();
    if (!text) return '';
    try {   // 1) MyMemory (free, documented API)
      const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent('ka|' + to)}`);
      const d = await r.json();
      const out = d && d.responseData && d.responseData.translatedText;
      if (Number(d.responseStatus) === 200 && out && !/MYMEMORY WARNING|INVALID|QUERY LENGTH/i.test(out)) return decode(out);
    } catch (_) { /* fall through */ }
    try {   // 2) fallback
      const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=ka&tl=${to}&dt=t&q=${encodeURIComponent(text)}`);
      const d = await r.json();
      return d[0].map(s => s[0]).join('');
    } catch (_) { /* give up */ }
    return '';
  }

  async function runTranslate(kind) {
    const text = SRC[kind].value;
    const my = (seq[kind] = (seq[kind] || 0) + 1);
    const langs = ['en', 'ru'].filter(l => !touched[kind + l]);

    if (!text.trim()) {
      langs.forEach(l => { TR[kind][l].value = ''; });
      setStatus('');
      return;
    }
    setStatus('⏳ მიმდინარეობს თარგმნა…', 'busy');
    const res = await Promise.all(langs.map(l => translateText(text, l)));
    if (my !== seq[kind]) return;                         // a newer run took over
    langs.forEach((l, i) => { if (res[i]) TR[kind][l].value = res[i]; });
    if (res.some(r => !r)) setStatus('⚠ ავტომატური თარგმნა ვერ მოხერხდა — შეავსეთ ხელით.', 'warn');
    else setStatus('✓ ნათარგმნია. საჭიროების შემთხვევაში შეგიძლიათ შეასწოროთ.', 'ok');
  }

  function schedule(kind) {
    clearTimeout(timers[kind]);
    pending[kind] = true;
    setStatus('⏳ თარგმანი მზადდება…', 'busy');
    timers[kind] = setTimeout(() => {
      pending[kind] = false;
      inflight[kind] = runTranslate(kind).finally(() => { inflight[kind] = null; });
    }, 800);
  }

  F.nameKa.addEventListener('input', () => schedule('name'));
  F.descKa.addEventListener('input', () => schedule('desc'));
  ['name', 'desc'].forEach(kind => ['en', 'ru'].forEach(l => {
    TR[kind][l].addEventListener('input', () => { touched[kind + l] = true; });
  }));

  $('retranslateBtn').addEventListener('click', async () => {
    touched = {};
    await Promise.all([runTranslate('name'), runTranslate('desc')]);
  });

  async function flushTranslations() {
    for (const kind of ['name', 'desc']) {
      if (pending[kind]) { clearTimeout(timers[kind]); pending[kind] = false; await runTranslate(kind); }
      else if (inflight[kind]) await inflight[kind];
    }
  }

  /* --- Photo: resized + compressed in the browser, stored inside the Firestore document --- */
  $('fPhoto').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 640;
        const k = Math.min(1, MAX / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        setPhoto(c.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => toast('ფოტოს წაკითხვა ვერ მოხერხდა', true);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
  $('photoRemove').addEventListener('click', () => setPhoto(''));

  /* --- Save --- */
  $('dishForm').addEventListener('submit', async e => {
    e.preventDefault();
    const nameKa = F.nameKa.value.trim();
    const price = parseFloat(String(F.price.value).replace(',', '.'));
    const wine = F.section.value === 'wine';
    const glassOn = wine && F.glassOn.checked;
    const glassPrice = parseFloat(String(F.glassPrice.value).replace(',', '.'));

    if (!nameKa) { toast('ჩაწერეთ კერძის დასახელება', true); F.nameKa.focus(); return; }
    if (!isFinite(price) || price < 0) { toast('მიუთითეთ ფასი', true); F.price.focus(); return; }
    if (glassOn && (!isFinite(glassPrice) || glassPrice <= 0)) { toast('მიუთითეთ ჭიქის ფასი', true); F.glassPrice.focus(); return; }

    const btn = $('saveBtn');
    btn.disabled = true;
    btn.textContent = 'ინახება…';
    try {
      await flushTranslations();

      // Fill any still-empty translation (fall back to Georgian so nothing is blank)
      let fellBack = false;
      for (const kind of ['name', 'desc']) {
        const ka = SRC[kind].value.trim();
        if (!ka) continue;
        for (const l of ['en', 'ru']) {
          const el = TR[kind][l];
          if (el.value.trim()) continue;
          const r = await translateText(ka, l);
          if (r) el.value = r; else { el.value = ka; fellBack = true; }
        }
      }

      const data = {
        section: F.section.value,
        name: { ka: nameKa, en: F.nameEn.value.trim(), ru: F.nameRu.value.trim() },
        desc: { ka: F.descKa.value.trim(), en: F.descEn.value.trim(), ru: F.descRu.value.trim() },
        price,
        glassEnabled: glassOn,
        glassPrice: glassOn ? glassPrice : null,
        image: photoData,
        imageUrl: '',
        active: F.active.checked
      };

      if (editingId) await store.update(editingId, data);
      else await store.add(data);

      toast(fellBack ? 'შენახულია (ზოგი თარგმანი ვერ მოხერხდა — შეამოწმეთ)' : 'კერძი შენახულია ✓', fellBack);
      resetForm();
      showTab('list');
    } catch (err) { fail(err); }
    btn.disabled = false;
    btn.textContent = 'შენახვა';
  });

  /* ---------- 10. AUTH & BOOT ---------- */
  $('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('loginErr');
    err.hidden = true;
    $('loginBtn').disabled = true;
    try {
      await store.login($('loginEmail').value.trim(), $('loginPass').value);
    } catch (ex) {
      err.textContent = 'ელფოსტა ან პაროლი არასწორია';
      err.hidden = false;
    }
    $('loginBtn').disabled = false;
  });
  $('logoutBtn').addEventListener('click', () => store.logout());

  function onUser(user) {
    if (user) {
      $('authView').hidden = true;
      $('app').hidden = false;
      $('logoutBtn').hidden = store.mode === 'local';
      $('modeBadge').textContent = store.mode === 'local' ? '⚠ ლოკალური დემო რეჟიმი (Firebase არ არის მიერთებული)' : '● Firestore · ონლაინ';
      if (unsub) unsub();
      unsub = store.subscribe(list => { items = list; renderList(); }, err => {
        console.error(err);
        toast('წვდომა უარყოფილია. შეამოწმეთ Firestore Rules და მენეჯერის UID.', true);
      });
      toggleWine();
    } else {
      if (unsub) { unsub(); unsub = null; }
      items = [];
      $('app').hidden = true;
      $('authView').hidden = false;
    }
  }

  (async () => {
    try {
      store = useFirebase ? await createFirebaseStore() : createLocalStore();
      store.onAuth(onUser);
    } catch (err) {
      console.error(err);
      document.body.innerHTML = '<p style="padding:40px;font-family:sans-serif">Firebase-ის ჩატვირთვა ვერ მოხერხდა. შეამოწმეთ ინტერნეტი და კონფიგურაცია.</p>';
    }
  })();
})();