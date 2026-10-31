/* Shared by every page: the 中/EN switch, plus small helpers.
   Text nodes carry data-en / data-zh; the choice is remembered in localStorage('lang'). */
(() => {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function detect() {
    try {
      const saved = localStorage.getItem('lang');
      if (saved === 'zh' || saved === 'en') return saved;
    } catch (e) {}
    return /^zh/i.test(navigator.language || '') ? 'zh' : 'en';
  }

  function apply(lang) {
    window.__lang = lang;
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-en]').forEach((el) => {
      const text = el.getAttribute(lang === 'zh' ? 'data-zh' : 'data-en');
      if (text != null) el.textContent = text;
    });
    document.querySelectorAll('input[data-lang]').forEach((input) => { input.checked = input.value === lang; });
    try { localStorage.setItem('lang', lang); } catch (e) {}
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches && t.matches('input[data-lang]') && t.checked) apply(t.value);
  });

  window.siteLang = () => (window.__lang === 'zh' ? 'zh' : 'en');
  window.siteEscape = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  window.siteFormatDate = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return iso || '';
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return window.siteLang() === 'zh' ? `${y}年${mo}月${d}日` : `${String(d).padStart(2, '0')} ${MONTHS[mo - 1]} ${y}`;
  };

  // Optional images (your portrait, video thumbnail): if the file isn't there yet, the frame keeps its placeholder mark.
  document.querySelectorAll('img[data-src]').forEach((img) => {
    img.addEventListener('error', () => img.remove(), { once: true });
    img.src = img.getAttribute('data-src');
  });

  apply(detect());
})();
