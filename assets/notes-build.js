/*
 * build_posts.py, in the browser. The writing desk (write.html) uses it to
 * rebuild content/posts.json when it saves a note, so the file it commits is
 * exactly what `python3 build_posts.py` would write for the same notes.
 * Change one, change the other.
 *
 * Every rule below mirrors the Python, including its idea of whitespace and
 * digits, so the two agree on any text — not only on ordinary notes.
 */
(() => {
  // Python's str.strip() and \s: Unicode whitespace, but not U+FEFF (which JS's \s includes).
  const WS = '\\t\\n\\v\\f\\r\\x1c-\\x20\\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000';
  const S = `[${WS}]`;
  const STRIP = new RegExp(`^${S}+|${S}+$`, 'gu');
  const RSTRIP = new RegExp(`${S}+$`, 'u');
  const strip = (s) => s.replace(STRIP, '');
  const rstrip = (s) => s.replace(RSTRIP, '');

  // Python's \d is any Unicode digit (\p{Nd}) and its . stops only at \n.
  const BLOCK_START = new RegExp(`^(#{1,6}${S}|[-*+]${S}|\\p{Nd}+[.)]${S}|>|\`\`\`)`, 'u');
  const HR = /^(-{3,}|\*{3,}|_{3,})$/u;
  const HEADING = new RegExp(`^(#{1,6})${S}+([^\\n]*)$`, 'u');
  const UL = new RegExp(`^[-*+]${S}+`, 'u');
  const OL = new RegExp(`^\\p{Nd}+[.)]${S}+`, 'u');
  const FILE_DATE = /^(\p{Nd}{4}-\p{Nd}{2}-\p{Nd}{2})[-_]?([^\n]*)$/u;

  // ------------------------------------------------------------ front matter
  function parseFrontMatter(text) {
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const meta = Object.create(null);
    if (strip(lines[0]) !== '---') return [meta, text];
    const end = lines.findIndex((line, i) => i > 0 && strip(line) === '---');
    if (end < 0) return [meta, text];
    for (let line of lines.slice(1, end)) {
      line = strip(line);
      if (!line || line.startsWith('#') || !line.includes(':')) continue;
      const at = line.indexOf(':');
      meta[strip(line.slice(0, at)).toLowerCase()] = strip(line.slice(at + 1));
    }
    return [meta, lines.slice(end + 1).join('\n')];
  }

  function unquote(v) {
    v = strip(v || '');
    return v.length >= 2 && v[0] === v[v.length - 1] && (v[0] === '"' || v[0] === "'") ? v.slice(1, -1) : v;
  }

  const asBool = (v) => ['true', 'yes', '1', 'on'].includes(unquote(v).toLowerCase());

  function asTags(v) {
    v = strip(v || '');
    if (v.startsWith('[') && v.endsWith(']')) v = v.slice(1, -1);
    return v.split(',').map(unquote).filter(Boolean);
  }

  // ---------------------------------------------------------------- markdown
  // html.escape(text, quote=False)
  const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const IMG = new RegExp(`!\\[([^\\]]*)\\]\\(([^)${WS}]+)\\)`, 'gu');
  const LINK = new RegExp(`\\[([^\\]]+)\\]\\(([^)${WS}]+)\\)`, 'gu');

  function inline(text) {
    return escape(text)
      .replace(IMG, '<img src="$2" alt="$1" loading="lazy">')
      .replace(LINK, '<a href="$2">$1</a>')
      .replace(/`([^`]+)`/gu, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/gu, '<strong>$1</strong>')
      .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/gu, '<em>$1</em>');
  }

  function markdownToHtml(md) {
    const lines = md.replace(/\r\n/g, '\n').split('\n');
    const n = lines.length;
    const blocks = [];
    let i = 0;

    while (i < n) {
      const cur = strip(lines[i]);
      if (!cur) { i += 1; continue; }

      if (cur.startsWith('```')) {                     // fenced code
        i += 1;
        const buf = [];
        while (i < n && strip(lines[i]) !== '```') { buf.push(lines[i]); i += 1; }
        i += 1;
        blocks.push(`<pre><code>${escape(buf.join('\n'))}</code></pre>`);
        continue;
      }

      if (cur.startsWith('<')) {                       // raw HTML passthrough
        const buf = [];
        while (i < n && strip(lines[i])) { buf.push(lines[i]); i += 1; }
        blocks.push(buf.join('\n'));
        continue;
      }

      const m = HEADING.exec(cur);                     // heading
      if (m) {
        const lvl = m[1].length;
        blocks.push(`<h${lvl}>${inline(strip(m[2]))}</h${lvl}>`);
        i += 1;
        continue;
      }

      if (HR.test(cur)) { blocks.push('<hr>'); i += 1; continue; }   // horizontal rule

      if (cur.startsWith('>')) {                       // blockquote
        const buf = [];
        while (i < n && strip(lines[i]).startsWith('>')) { buf.push(strip(strip(lines[i]).slice(1))); i += 1; }
        blocks.push(`<blockquote><p>${buf.filter(Boolean).map(inline).join('<br>')}</p></blockquote>`);
        continue;
      }

      const list = UL.test(cur) ? ['ul', UL] : OL.test(cur) ? ['ol', OL] : null;
      if (list) {                                      // unordered / ordered list
        const [tag, re] = list;
        const items = [];
        while (i < n && re.test(strip(lines[i]))) { items.push(inline(strip(lines[i]).replace(re, ''))); i += 1; }
        blocks.push(`<${tag}>${items.map((x) => `<li>${x}</li>`).join('')}</${tag}>`);
        continue;
      }

      const buf = [];                                  // paragraph
      while (i < n) {
        const line = strip(lines[i]);
        if (!line || BLOCK_START.test(line) || HR.test(line)) break;
        buf.push(line);
        i += 1;
      }
      if (buf.length) blocks.push(`<p>${buf.map(inline).join('<br>')}</p>`);
      else i += 1; // unreachable (every block start is taken above); guards against looping forever
    }

    return blocks.join('');
  }

  // -------------------------------------------------------------- post build
  // html.unescape: each character reference, decoded by the browser's own HTML5 rules.
  const decoder = document.createElement('textarea');
  const unescapeHtml = (s) => s.replace(/&(#[0-9]+;?|#[xX][0-9a-fA-F]+;?|[^\t\n\f <&#;]{1,32};?)/g, (ref) => {
    decoder.innerHTML = ref;
    return decoder.value;
  });

  function autoExcerpt(bodyHtml, limit = 100) {
    const m = /<p>([\s\S]*?)<\/p>/u.exec(bodyHtml);
    if (!m) return '';
    const text = strip(unescapeHtml(m[1].replace(/<[^>]+>/gu, '')).replace(/\n/g, ' '));
    const chars = Array.from(text); // Python counts code points
    return chars.length <= limit ? text : `${rstrip(chars.slice(0, limit).join(''))}…`;
  }

  // `name` is the file name in content/posts/; `today` stands in for the file
  // date that build_posts.py falls back to when a note has no date at all.
  function buildPost(name, text, today) {
    // read_text() reads with universal newlines: \r\n and a lone \r both become \n.
    const [meta, bodyMd] = parseFrontMatter(text.replace(/\r\n?/g, '\n'));
    const dot = name.lastIndexOf('.');
    const stem = dot > 0 ? name.slice(0, dot) : name;

    let date = unquote(meta.date);
    let base = stem;
    const m = FILE_DATE.exec(stem);
    if (m) {
      date = date || m[1];
      base = m[2] || m[1];
    }
    date = date || today;

    // A file named *.draft.md is always a draft (and gitignored, so it never reaches GitHub).
    const forcedDraft = name.endsWith('.draft.md');
    if (forcedDraft) base = base.replace(/\.draft$/u, '');

    const bodyHtml = strip(markdownToHtml(bodyMd));
    return {
      slug: unquote(meta.slug) || base,
      title: unquote(meta.title) || base,
      date,
      excerpt: unquote(meta.excerpt) || autoExcerpt(bodyHtml),
      tags: asTags(meta.tags),
      coverImage: unquote(meta.cover) || null,
      bodyHtml,
      _draft: forcedDraft || asBool(meta.draft || ''),
      _file: name,
    };
  }

  // Python compares strings by code point; JS's < compares UTF-16 units, which differ past U+FFFF.
  function compare(a, b) {
    const x = Array.from(a), y = Array.from(b);
    for (let i = 0; i < Math.min(x.length, y.length); i++) {
      if (x[i] !== y[i]) return x[i].codePointAt(0) - y[i].codePointAt(0);
    }
    return x.length - y.length;
  }

  class DuplicateSlug extends Error {
    constructor(slug, first, second) {
      super(`Duplicate slug ${slug} in ${first} and ${second}`);
      Object.assign(this, { slug, first, second });
    }
  }

  // files: [{ name, text }] for every .md in content/posts/. Returns the text of content/posts.json.
  function buildPostsJson(files, today) {
    const posts = [];
    const seen = new Map();
    for (const f of files.slice().sort((a, b) => compare(a.name, b.name))) {
      const p = buildPost(f.name, f.text, today);
      if (seen.has(p.slug)) throw new DuplicateSlug(p.slug, seen.get(p.slug), f.name);
      seen.set(p.slug, f.name);
      posts.push(p);
    }
    posts.sort((a, b) => compare(b.date, a.date) || compare(b.slug, a.slug));
    const published = posts.filter((p) => !p._draft).map((p) => ({
      slug: p.slug, title: p.title, date: p.date, excerpt: p.excerpt, tags: p.tags, coverImage: p.coverImage, bodyHtml: p.bodyHtml,
    }));
    return `${JSON.stringify({ posts: published }, null, 2)}\n`;
  }

  window.NotesBuild = { strip, unquote, asBool, asTags, parseFrontMatter, markdownToHtml, autoExcerpt, buildPost, buildPostsJson, DuplicateSlug };
})();
