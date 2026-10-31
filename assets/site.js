/* Shared by every page: the EN / 中 / DE switch, plus small helpers.
   Text nodes carry data-en / data-zh / data-de (a missing translation falls back to English);
   the choice is remembered in localStorage('lang'). */
(() => {
  const LANGS = ['en', 'zh', 'de'];
  const HTML_LANG = { en: 'en', zh: 'zh-CN', de: 'de' };
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function detect() {
    try {
      const saved = localStorage.getItem('lang');
      if (LANGS.includes(saved)) return saved;
    } catch (e) {}
    const nav = (navigator.language || '').toLowerCase();
    return nav.startsWith('zh') ? 'zh' : nav.startsWith('de') ? 'de' : 'en';
  }

  function apply(lang) {
    window.__lang = lang;
    document.documentElement.lang = HTML_LANG[lang];
    document.querySelectorAll('[data-en]').forEach((el) => {
      el.textContent = el.getAttribute(`data-${lang}`) ?? el.getAttribute('data-en');
    });
    document.querySelectorAll('input[data-lang]').forEach((input) => { input.checked = input.value === lang; });
    try { localStorage.setItem('lang', lang); } catch (e) {}
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches && t.matches('input[data-lang]') && t.checked) apply(t.value);
  });

  window.siteLang = () => (LANGS.includes(window.__lang) ? window.__lang : 'en');
  // Strings in code come as [en, zh, de]; a missing one falls back to English.
  window.sitePick = (strings) => strings[LANGS.indexOf(window.siteLang())] ?? strings[0];
  window.siteEscape = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  window.siteFormatDate = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return iso || '';
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const lang = window.siteLang();
    if (lang === 'zh') return `${y}年${mo}月${d}日`;
    if (lang === 'de') return `${m[3]}.${m[2]}.${y}`;
    return `${String(d).padStart(2, '0')} ${MONTHS[mo - 1]} ${y}`;
  };

  // Optional images (your portrait, video thumbnail): if the file isn't there yet, the frame keeps its placeholder mark.
  document.querySelectorAll('img[data-src]').forEach((img) => {
    img.addEventListener('error', () => img.remove(), { once: true });
    img.src = img.getAttribute('data-src');
  });

  apply(detect());
})();
