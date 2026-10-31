/*
 * Page turn — the transition between pages, shared by every page.
 *
 * The site reads like a book: the name is the spine, the home page is the
 * contents. Moving deeper (contents → a section → a note or the CV), the
 * current page turns away around the spine and the next page lies beneath
 * it. Moving back, the destination page folds in over the current one.
 * The link that was clicked stays highlighted on the turning page.
 *
 * The motion is tied to loading. Before leaving for another page, that page
 * is fetched in the background: if it arrives quickly the turn is a brief
 * half-second; if not, the page slows and hovers mid-turn, gently breathing,
 * over a title page for the destination, and finishes once it is ready. The
 * title page carries across the navigation and dissolves when the new page
 * has rendered — pages can delay that with turn.hold(promise).
 *
 * Load this at the very start of <body> (it must cover a page before it
 * paints). Visitors who ask for reduced motion get plain navigation.
 */
(() => {
  const KEY = 'turn';
  const ORDER = { home: 0, about: 1, teaching: 2, notes: 3 };
  const NUM = { about: '01', teaching: '02', notes: '03' };
  const ALIASES = { thoughts: 'notes', newsletter: 'notes', projects: 'teaching' };
  const LANGS = [['en', 'EN'], ['zh', '中'], ['de', 'DE']];
  const LABELS = {
    contents: ['Contents', '目录', 'Inhalt'], about: ['About', '关于', 'Über mich'], teaching: ['Teaching', '教学', 'Lehre'],
    notes: ['Notes', '随笔', 'Notizen'], cv: ['CV', '简历', 'Lebenslauf'],
  };
  const BACK = '<svg class="icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>';

  // The curve: ease toward HOLD of the turn while the next page loads (breathing
  // gently once it has slowed), then finish over FINISH ms, never sooner than
  // MIN ms after the click. With nothing to wait for, a turn takes ~570 ms.
  // HOLD 0.8 hovers at -80°: the turning page stays visible while the title
  // of the page beneath can already be read.
  const HOLD = 0.8, TAU = 210, MIN = 150, FINISH = 420;
  const BREATH = 0.02, BREATH_PERIOD = 1800, BREATH_IN = 600;
  const MAX_WAIT = 10000;

  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // site.js is not loaded yet when a page first arrives, so mirror its rule.
  function lang() {
    if (window.siteLang) return window.siteLang();
    try { const s = localStorage.getItem('lang'); if (LANGS.some(([v]) => v === s)) return s; } catch (e) {}
    const nav = (navigator.language || '').toLowerCase();
    return nav.startsWith('zh') ? 'zh' : nav.startsWith('de') ? 'de' : 'en';
  }
  const label = (k) => LABELS[k][Math.max(0, LANGS.findIndex(([v]) => v === lang()))];

  /* ---------- the motion ---------- */

  function run(paint, ready) {
    const t0 = performance.now();
    let raf = 0, done = false, readyAt = null, finish = null, settle;
    const promise = new Promise((r) => { settle = r; });
    function stop(toEnd) {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      if (toEnd) paint(1);
      settle(toEnd);
    }
    const mark = () => {
      readyAt = performance.now();
      // Browsers stop drawing frames in a hidden tab; finish on time regardless,
      // so a navigation can never be left waiting.
      setTimeout(() => stop(true), Math.max(0, MIN - (readyAt - t0)) + FINISH + 250);
    };
    Promise.resolve(ready).then(mark, mark);

    const ease = (t) => HOLD * (1 - Math.exp(-t / TAU));
    const speed = (t) => (HOLD / TAU) * Math.exp(-t / TAU);
    const breath = (t) => (t < BREATH_IN ? 0
      : BREATH * Math.min(1, (t - BREATH_IN) / 700) * Math.sin((2 * Math.PI * (t - BREATH_IN)) / BREATH_PERIOD));

    function frame(now) {
      const t = now - t0;
      if (!finish && readyAt !== null && t >= MIN) finish = { t, p: ease(t) + breath(t), v: speed(t) };
      if (finish) {
        // Cubic Hermite from the current position and speed to rest at the end,
        // so a turn that is still moving never jerks when it is told to finish.
        const s = Math.min(1, (t - finish.t) / FINISH), s2 = s * s, s3 = s2 * s;
        paint((2 * s3 - 3 * s2 + 1) * finish.p + (s3 - 2 * s2 + s) * FINISH * finish.v + (3 * s2 - 2 * s3));
        if (s >= 1) { done = true; settle(true); return; }
      } else {
        paint(ease(t) + breath(t));
      }
      raf = requestAnimationFrame(frame);
    }

    paint(0);
    raf = requestAnimationFrame(frame);
    return { promise, stop };
  }

  /* ---------- the layers ---------- */

  function layer(cls, parent) {
    const el = document.createElement('div');
    el.className = cls;
    el.setAttribute('aria-hidden', 'true');
    (parent || document.body).appendChild(el);
    return el;
  }

  // A visual copy of a page, pinned where it is on screen, so it can turn away
  // while the real page changes underneath. The clicked link is marked on it.
  function snapshot(el, trigger) {
    const r = el.getBoundingClientRect();
    const copy = el.cloneNode(true);
    if (trigger && el.contains(trigger)) {
      const path = [];
      for (let n = trigger; n !== el; n = n.parentElement) path.unshift(Array.prototype.indexOf.call(n.parentElement.children, n));
      let m = copy;
      for (const i of path) m = m && m.children[i];
      if (m) m.classList.add('turn-trigger');
    }
    copy.removeAttribute('id');
    copy.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    // Copied radios must not join the real radio groups.
    copy.querySelectorAll('input, a, button').forEach((n) => { n.removeAttribute('name'); n.tabIndex = -1; });
    copy.setAttribute('aria-hidden', 'true');
    copy.inert = true;
    copy.classList.add('turn-snap');
    Object.assign(copy.style, {
      position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', margin: '0',
      clipPath: `inset(${Math.max(0, -r.top)}px 0 ${Math.max(0, r.top + r.height - innerHeight)}px 0)`,
    });
    return { el: copy, rect: r };
  }

  // Turns `leaf` around its left edge, the spine. 'away' lifts it off (0 → -100°);
  // 'in' brings it down (-100° → 0). It darkens as it turns from the light, a
  // soft highlight crosses it, and it shadows the gutter of the page beneath.
  function painter(leaf, width, originY, mode) {
    const persp = Math.max(1600, width * 2.4);
    leaf.style.transformOrigin = `0px ${originY}px`;
    leaf.style.backfaceVisibility = 'hidden';
    leaf.style.willChange = 'transform';
    const shade = layer('turn-shade', leaf);
    const sheen = layer('turn-sheen', leaf);
    const cast = layer('turn-cast');
    return {
      cast,
      paint(p) {
        const angle = mode === 'away' ? -100 * p : -100 * (1 - p);
        const a = -angle, lift = Math.min(1, a / 90);
        leaf.style.transform = `perspective(${persp}px) rotateY(${angle.toFixed(2)}deg)`;
        shade.style.opacity = (0.9 * Math.pow(lift, 1.4)).toFixed(3);
        sheen.style.opacity = (0.55 * Math.sin(Math.PI * lift)).toFixed(3);
        sheen.style.backgroundPosition = `${(85 - 70 * lift).toFixed(1)}% 0`;
        cast.style.opacity = (0.85 * (a <= 90 ? Math.sin((a * Math.PI) / 180) : Math.max(0, (100 - a) / 10))).toFixed(3);
      },
      remove() { shade.remove(); sheen.remove(); cast.remove(); },
    };
  }

  // The destination's title page, drawn with the site's own classes so it
  // lines up with the real page that replaces it.
  function opener(d, at) {
    const op = document.createElement('div');
    op.className = 'turn-opener';
    op.setAttribute('aria-hidden', 'true');
    op.style.setProperty('--turn-elapsed', String(Math.max(0, Date.now() - at)));
    const on = lang();
    const bar = d.back
      ? `<div class="topbar"><span class="btn btn-ghost back">${BACK}<span>${esc(d.back)}</span></span>`
        + `<span class="seg lang">${LANGS.map(([v, t]) => `<span class="seg-opt${v === on ? ' is-on' : ''}">${t}</span>`).join('')}</span></div>`
      : '';
    const head = d.kind === 'article'
      ? `<div class="article"><span class="kicker">${esc(d.kicker)}</span><h1 class="article-title">${esc(d.title)}</h1><span class="turn-wait"></span></div>`
      : `<header class="sec-head"><span class="kicker">${esc(d.kicker)}</span><h1 class="sec-title">${esc(d.title)}</h1><span class="turn-wait"></span></header>`;
    op.innerHTML = bar + head;
    return op;
  }

  /* ---------- where a link leads ---------- */

  function placeOf(url) {
    const file = url.pathname.split('/').pop();
    if (file === 'thought.html' || file === 'resume.html') return { file, depth: 4 };
    if (file !== '' && file !== 'index.html') return null;
    let k = decodeURIComponent((url.hash || '').slice(1)).toLowerCase();
    k = ALIASES[k] || k;
    return ORDER[k] ? { file: 'index.html', view: k, depth: ORDER[k] } : { file: 'index.html', view: 'home', depth: 0 };
  }

  function describe(url, link) {
    const p = placeOf(url);
    if (!p) return null;
    if (p.file === 'thought.html') {
      return { depth: 4, kind: 'article', kicker: link.dataset.turnKicker || '', title: link.dataset.turnTitle || link.textContent.trim(), back: label('notes') };
    }
    if (p.file === 'resume.html') return { depth: 4, kind: 'section', kicker: 'PDF', title: label('cv'), back: label('about') };
    if (p.view === 'home') return { depth: 0, kind: 'section', kicker: label('contents'), title: 'Zhaoyi Chen', back: '' };
    return { depth: p.depth, kind: 'section', kicker: NUM[p.view], title: label(p.view), back: label('contents') };
  }

  const visiblePage = () => Array.prototype.find.call(
    document.querySelectorAll('.shell > :not(.spine)'), (n) => !n.hidden && n.offsetParent !== null);

  const fetched = new Map();
  function prefetch(url) {
    const key = url.href.split('#')[0];
    if (!fetched.has(key)) fetched.set(key, fetch(key, { credentials: 'same-origin' }).then((r) => r.text()).catch(() => null));
    return fetched.get(key);
  }

  /* ---------- turning ---------- */

  let current = null;
  const settleCurrent = () => { if (current) { const c = current; current = null; c.end(); } };

  let lastTrigger = null;
  const recentTrigger = () => (lastTrigger && performance.now() - lastTrigger.at < 1000 ? lastTrigger.el : null);

  // Within a page (index.html's sections): `apply` switches the real page at once.
  function swap({ from, to, apply, forward, ready }) {
    settleCurrent();
    if (reduced() || document.hidden || !from || !to) { apply(); return; }
    const snap = snapshot(from, recentTrigger());
    document.body.appendChild(snap.el);
    apply();
    let pt, cleanup;
    if (forward) {
      snap.el.style.zIndex = '30';
      pt = painter(snap.el, snap.rect.width, innerHeight / 2 - snap.rect.top, 'away');
      pt.cast.style.zIndex = '25';
      cleanup = () => { pt.remove(); snap.el.remove(); };
    } else {
      snap.el.style.zIndex = '5';
      const r = to.getBoundingClientRect();
      to.style.position = 'relative';
      to.style.zIndex = '10';
      pt = painter(to, r.width, innerHeight / 2 - r.top, 'in');
      pt.cast.style.zIndex = '7';
      cleanup = () => {
        pt.remove();
        snap.el.remove();
        ['position', 'zIndex', 'transform', 'transformOrigin', 'backfaceVisibility', 'willChange'].forEach((k) => { to.style[k] = ''; });
      };
    }
    const motion = run(pt.paint, ready);
    // Tear down at once when settled early: a turn starting mid-turn must not
    // have this one's cleanup land on its own setup a microtask later.
    let open = true;
    const close = () => { if (open) { open = false; cleanup(); } };
    const handle = { end: () => { motion.stop(true); close(); } };
    current = handle;
    motion.promise.then(() => { close(); if (current === handle) current = null; });
  }

  // To another page: turn while it loads, then navigate.
  function go(url, dest, trigger) {
    settleCurrent();
    if (reduced() || document.hidden) { location.href = url.href; return; }
    const at = Date.now();
    const ready = Promise.race([prefetch(url), delay(MAX_WAIT)]);
    const from = visiblePage();
    const op = opener(dest, at);
    const extra = [];
    let pt;
    if (from && dest.depth > (placeOf(location) || { depth: 0 }).depth) {
      document.body.appendChild(op);
      const snap = snapshot(from, trigger);
      snap.el.style.zIndex = '30';
      document.body.appendChild(snap.el);
      extra.push(snap.el);
      pt = painter(snap.el, snap.rect.width, innerHeight / 2 - snap.rect.top, 'away');
    } else {
      op.classList.add('is-leaf');
      document.body.appendChild(op);
      pt = painter(op, op.getBoundingClientRect().width, innerHeight / 2, 'in');
    }
    pt.cast.style.zIndex = '25';
    const motion = run(pt.paint, ready);
    const handle = {
      end() { motion.stop(false); pt.remove(); op.remove(); extra.forEach((n) => n.remove()); },
    };
    current = handle;
    motion.promise.then((completed) => {
      if (!completed || current !== handle) return;
      try {
        sessionStorage.setItem(KEY, JSON.stringify({
          path: url.pathname, kind: dest.kind, kicker: dest.kicker, title: dest.title, back: dest.back || '', at,
        }));
      } catch (e) {}
      location.href = url.href;
    });
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    lastTrigger = { el: a, at: performance.now() };
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if ((a.target && a.target !== '_self') || a.hasAttribute('download') || a.dataset.turn === 'off') return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return; // same page: index.html routes it
    const dest = describe(url, a);
    if (!dest) return;
    e.preventDefault();
    go(url, dest, a);
  });

  // Start loading a page as soon as the pointer reaches its link.
  document.addEventListener('pointerover', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || (a.target && a.target !== '_self')) return;
    const url = new URL(a.href, location.href);
    if (url.origin === location.origin && url.pathname !== location.pathname && placeOf(url)) prefetch(url);
  }, { passive: true });

  // Coming back with the Back button can restore this page mid-turn; tidy it.
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    settleCurrent();
    document.querySelectorAll('.turn-opener, .turn-snap, .turn-cast').forEach((n) => n.remove());
  });

  /* ---------- arriving ---------- */

  const holds = [];
  (function arrive() {
    let h = null;
    try { h = JSON.parse(sessionStorage.getItem(KEY) || 'null'); sessionStorage.removeItem(KEY); } catch (e) {}
    if (!h || Date.now() - h.at > 8000 || h.path !== location.pathname || reduced()) return;
    const op = opener(h, h.at);
    op.classList.add('is-arrival');
    (document.body || document.documentElement).appendChild(op);
    const domReady = new Promise((r) => (document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', r, { once: true }) : r()));
    domReady
      .then(() => Promise.race([Promise.all(holds.concat(document.fonts ? [document.fonts.ready] : [])), delay(8000)]))
      .catch(() => {})
      .then(() => {
        const root = document.documentElement;
        root.classList.add('turn-settle');
        op.classList.add('is-leaving');
        setTimeout(() => { op.remove(); root.classList.remove('turn-settle'); }, 520);
      });
  })();

  window.turn = {
    swap,
    hold(p) { holds.push(Promise.resolve(p).catch(() => {})); },
  };
})();
