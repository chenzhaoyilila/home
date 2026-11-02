/*
 * Writing desk — the site owner writes and edits Notes here, on the website.
 *
 * GitHub is the only server. Saving makes one commit to the repository behind
 * the site: the note's Markdown file in content/posts/ plus content/posts.json,
 * rebuilt by the same rules as build_posts.py (assets/notes-build.js), and any
 * images the note gained. GitHub Pages publishes it about a minute later.
 *
 * A commit needs a GitHub key from the owner's account, kept only in this
 * browser. Anyone can open this page; only the owner can change anything.
 */
(() => {
  // Never run inside someone else's page.
  if (window.top !== window.self) return;

  const OWNER = 'chenzhaoyilila';
  const REPO = 'home';
  const BRANCH = 'main';
  const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
  const POSTS = 'content/posts/';
  const POSTS_JSON = 'content/posts.json';
  const IMAGES = 'content/images/notes/';
  const KEY = 'desk.key';            // localStorage when remembered, sessionStorage otherwise; site.js checks it too
  const UNSAVED = 'desk.unsaved:';   // + the note's path, or "new": changes not yet saved to GitHub
  const VIEW = 'desk.view';
  const LIVE = /\.github\.io$/.test(location.hostname);
  const MOD = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Ctrl+';
  const NB = window.NotesBuild;

  // Strings come as [en, zh, de]; {name} is filled in.
  const L = {
    loading: ['Loading…', '正在加载…', 'Wird geladen…'],
    empty: ['No notes yet.', '还没有随笔。', 'Noch keine Notizen.'],
    untitled: ['Untitled', '无标题', 'Ohne Titel'],
    stateNew: ['New', '新', 'Neu'],
    stateDraft: ['Draft', '草稿', 'Entwurf'],
    stateLive: ['Published', '已发布', 'Veröffentlicht'],
    saveDraft: ['Save draft', '保存草稿', 'Entwurf speichern'],
    unpublish: ['Unpublish', '取消发布', 'Zurückziehen'],
    publish: ['Publish', '发布', 'Veröffentlichen'],
    update: ['Update', '更新', 'Aktualisieren'],
    cancel: ['Cancel', '取消', 'Abbrechen'],
    unsaved: ['Unsaved changes', '有未保存的修改', 'Ungespeicherte Änderungen'],
    restored: ['Brought back the changes you hadn’t saved ({time}).', '已恢复你上次未保存的修改（{time}）。', 'Deine nicht gespeicherten Änderungen ({time}) sind wieder da.'],
    discard: ['Discard them', '放弃这些修改', 'Verwerfen'],
    saving: ['Saving to GitHub…', '正在保存到 GitHub…', 'Wird auf GitHub gespeichert…'],
    deleting: ['Deleting…', '正在删除…', 'Wird gelöscht…'],
    published: ['Published. It will be on the site in about a minute.', '已发布，大约一分钟后出现在网站上。', 'Veröffentlicht. In etwa einer Minute ist sie auf der Website.'],
    updated: ['Updated. The site follows in about a minute.', '已更新，网站大约一分钟后同步。', 'Aktualisiert. Die Website zieht in etwa einer Minute nach.'],
    draftSaved: ['Draft saved to GitHub. It isn’t on the site.', '草稿已保存到 GitHub，不会出现在网站上。', 'Entwurf auf GitHub gespeichert. Er ist nicht auf der Website.'],
    unpublished: ['Unpublished. It leaves the site in about a minute.', '已取消发布，大约一分钟后从网站上撤下。', 'Zurückgezogen. In etwa einer Minute ist sie nicht mehr auf der Website.'],
    deleted: ['Deleted.', '已删除。', 'Gelöscht.'],
    live: ['Live on the site now.', '已在网站上线。', 'Jetzt auf der Website.'],
    gone: ['Off the site now.', '已从网站上撤下。', 'Nicht mehr auf der Website.'],
    slow: ['Saved. GitHub is still building the site — check again in a minute.', '已保存。GitHub 仍在生成网站，请过一分钟再看。', 'Gespeichert. GitHub baut die Website noch – schau in einer Minute wieder nach.'],
    needTitle: ['Give the note a title.', '请给随笔起个标题。', 'Gib der Notiz einen Titel.'],
    needDate: ['Pick a date.', '请选择日期。', 'Wähle ein Datum.'],
    badSlug: ['The link may only use letters, numbers and dashes.', '链接只能包含字母、数字和连字符。', 'Der Link darf nur Buchstaben, Zahlen und Bindestriche enthalten.'],
    slugTaken: ['Another note already uses this link. Change it below.', '已有随笔使用了这个链接，请在下方修改。', 'Eine andere Notiz nutzt diesen Link schon. Ändere ihn unten.'],
    duplicate: ['Two notes share the link “{slug}” ({first} and {second}). Give one of them its own link.',
      '两篇随笔使用了同一个链接“{slug}”（{first} 和 {second}），请为其中一篇换个链接。',
      'Zwei Notizen teilen sich den Link „{slug}“ ({first} und {second}). Gib einer davon einen eigenen Link.'],
    imageAdded: ['Image added. It is uploaded when you save.', '图片已插入，会在保存时一起上传。', 'Bild eingefügt. Es wird beim Speichern hochgeladen.'],
    imageBad: ['That file isn’t an image this page can use.', '这个文件不是本页能用的图片。', 'Diese Datei ist kein Bild, das diese Seite verwenden kann.'],
    imageBig: ['That image is too large (over 20 MB).', '这张图片太大了（超过 20 MB）。', 'Dieses Bild ist zu groß (über 20 MB).'],
    offline: ['Couldn’t reach GitHub. Check your connection and try again.', '无法连接 GitHub，请检查网络后重试。', 'GitHub ist nicht erreichbar. Prüfe deine Verbindung und versuch es noch einmal.'],
    badKey: ['GitHub didn’t accept this key. It may have expired or been revoked — create a new one.', 'GitHub 不接受这个密钥，它可能已过期或被撤销——请重新创建一个。',
      'GitHub hat diesen Schlüssel nicht angenommen. Vielleicht ist er abgelaufen oder widerrufen – erstelle einen neuen.'],
    cantWrite: [`This key isn’t allowed to save to ${OWNER}/${REPO}. On GitHub, check that the key includes the repository “${REPO}” and that Contents is set to Read and write.`,
      `这个密钥无权保存到 ${OWNER}/${REPO}。请在 GitHub 上确认密钥包含仓库“${REPO}”，并且 Contents 设为 Read and write。`,
      `Dieser Schlüssel darf nicht in ${OWNER}/${REPO} speichern. Prüfe auf GitHub, dass der Schlüssel das Repository „${REPO}“ enthält und Contents auf „Read and write“ steht.`],
    rateLimit: ['GitHub’s hourly limit is used up. Try again in a few minutes.', '已达到 GitHub 每小时的请求上限，请几分钟后再试。', 'Das Stundenlimit von GitHub ist erreicht. Versuch es in ein paar Minuten noch einmal.'],
    github: ['GitHub answered with an error: {detail}', 'GitHub 返回了错误：{detail}', 'GitHub meldet einen Fehler: {detail}'],
  };
  const PH = {
    title: ['Title', '标题', 'Titel'],
    tags: ['e.g. newsletter, game theory', '例如：newsletter, 博弈论', 'z. B. newsletter, Spieltheorie'],
    body: ['Write here. A blank line starts a new paragraph.', '在这里写。空一行开始新的段落。', 'Schreib hier. Eine Leerzeile beginnt einen neuen Absatz.'],
  };
  const TIPS = {
    bold: ['Bold ({mod}B)', '粗体（{mod}B）', 'Fett ({mod}B)'],
    italic: ['Italic ({mod}I)', '斜体（{mod}I）', 'Kursiv ({mod}I)'],
    heading: ['Heading', '小标题', 'Überschrift'],
    quote: ['Quote', '引用', 'Zitat'],
    list: ['List', '列表', 'Liste'],
    numbered: ['Numbered list', '编号列表', 'Nummerierte Liste'],
    code: ['Code', '代码', 'Code'],
    link: ['Link ({mod}K)', '链接（{mod}K）', 'Link ({mod}K)'],
    image: ['Image', '图片', 'Bild'],
    format: ['Formatting', '格式', 'Formatierung'],
    view: ['View', '视图', 'Ansicht'],
    body: ['Text, in Markdown', '正文（Markdown）', 'Text in Markdown'],
    reload: ['Reload from GitHub', '从 GitHub 重新加载', 'Von GitHub neu laden'],
  };
  const ASK = {
    remove: {
      title: ['Delete this note?', '删除这篇随笔？', 'Diese Notiz löschen?'],
      body: ['“{title}” disappears from the site and from GitHub. GitHub’s history still keeps a copy.',
        '“{title}”将从网站和 GitHub 上删除。GitHub 的历史记录里仍会保留一份。',
        '„{title}“ verschwindet von der Website und aus GitHub. Der Verlauf auf GitHub behält eine Kopie.'],
      ok: ['Delete', '删除', 'Löschen'], danger: true,
    },
    changed: {
      title: ['This note changed on GitHub', '这篇随笔在 GitHub 上被改动过', 'Diese Notiz wurde auf GitHub geändert'],
      body: ['It was edited somewhere else after you opened it. Save your version anyway and replace that one?',
        '在你打开之后，它在别处被修改过。仍要保存你的版本并覆盖那个版本吗？',
        'Sie wurde woanders bearbeitet, nachdem du sie geöffnet hast. Trotzdem deine Fassung speichern und die andere ersetzen?'],
      ok: ['Replace it', '覆盖', 'Ersetzen'], danger: true,
    },
    vanished: {
      title: ['This note was deleted on GitHub', '这篇随笔已在 GitHub 上被删除', 'Diese Notiz wurde auf GitHub gelöscht'],
      body: ['It was removed somewhere else after you opened it. Save it again as it is here?',
        '在你打开之后，它在别处被删除了。要按这里的内容重新保存吗？',
        'Sie wurde woanders entfernt, nachdem du sie geöffnet hast. So, wie sie hier steht, neu speichern?'],
      ok: ['Save again', '重新保存', 'Neu speichern'],
    },
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    connect: $('connect'), connectForm: $('connect-form'), keyInput: $('key-input'), remember: $('remember'), connectBtn: $('connect-btn'), connectMsg: $('connect-msg'),
    who: $('who'), signOut: $('sign-out'), desk: $('desk'), list: $('note-list'), newNote: $('new-note'), reload: $('reload'),
    editor: $('editor'), state: $('state'), notice: $('notice'), viewLive: $('view-live'), localNote: $('local-note'), slugField: $('slug-field'),
    toolbar: $('toolbar'), panes: $('panes'), preview: $('preview'), imageFile: $('image-file'),
    del: $('btn-delete'), draft: $('btn-draft'), publish: $('btn-publish'),
    dialog: $('dialog'), dialogTitle: $('dialog-title'), dialogBody: $('dialog-body'), dialogOk: $('dialog-ok'), dialogCancel: $('dialog-cancel'),
  };
  const F = { title: $('f-title'), date: $('f-date'), tags: $('f-tags'), excerpt: $('f-excerpt'), slug: $('f-slug'), body: $('f-body') };

  const T = (s) => window.sitePick(s);
  const esc = window.siteEscape;
  const format = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? vars[k] : m));
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const isPost = (path) => path.startsWith(POSTS) && path.endsWith('.md') && !path.slice(POSTS.length).includes('/');
  const fileName = (path) => path.slice(POSTS.length);
  const tagList = (s) => s.split(',').map((t) => t.replace(/[[\],]/g, '').trim()).filter(Boolean);
  const SLUG = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

  function slugify(s) {
    const plain = s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .normalize('NFKD').replace(/\p{M}/gu, '').normalize('NFC');
    return Array.from(plain.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '')).slice(0, 60).join('').replace(/-+$/, '');
  }

  const keyStore = {
    get() { try { return localStorage.getItem(KEY) || sessionStorage.getItem(KEY) || ''; } catch (e) { return ''; } },
    set(value, remember) { try { (remember ? localStorage : sessionStorage).setItem(KEY, value); } catch (e) {} },
    clear() { try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch (e) {} },
  };
  const unsaved = {
    get(id) { try { return JSON.parse(localStorage.getItem(UNSAVED + id) || 'null'); } catch (e) { return null; } },
    set(id, value) { try { localStorage.setItem(UNSAVED + id, JSON.stringify(value)); } catch (e) {} },
    clear(id) { try { localStorage.removeItem(UNSAVED + id); } catch (e) {} },
  };

  /* ---------- GitHub ---------- */

  let key = '';
  let login = '';

  class GitHubError extends Error {
    constructor(status, data, remaining) {
      super((data && data.message) || `HTTP ${status}`);
      Object.assign(this, { status, remaining });
    }
  }
  // Something to tell the person at the desk: `say` is a key of L, or null when they chose to stop.
  class DeskError extends Error {
    constructor(say, vars) {
      super(say || 'stopped');
      Object.assign(this, { say, vars });
    }
  }

  async function gh(path, method = 'GET', body) {
    let r;
    try {
      r = await fetch(path.startsWith('https://') ? path : API + path, {
        method,
        cache: 'no-store',
        headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${key}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (e) {
      throw new GitHubError(0, null);
    }
    const data = await r.json().catch(() => null);
    if (!r.ok) throw new GitHubError(r.status, data, r.headers.get('x-ratelimit-remaining'));
    return data;
  }

  function explain(err) {
    if (err instanceof DeskError) return format(T(L[err.say]), err.vars);
    if (!(err instanceof GitHubError)) return format(T(L.github), { detail: err.message || String(err) });
    if (err.status === 0) return T(L.offline);
    if (err.status === 401) return T(L.badKey);
    if (err.status === 403 && err.remaining === '0') return T(L.rateLimit);
    if (err.status === 403 || err.status === 404) return T(L.cantWrite);
    return format(T(L.github), { detail: `${err.status} ${err.message}` });
  }

  const decode = (b64) => new TextDecoder('utf-8', { ignoreBOM: true })
    .decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));
  const blobs = new Map(); // sha → Promise of the text
  function blobText(sha) {
    if (!blobs.has(sha)) {
      blobs.set(sha, gh(`/git/blobs/${sha}`).then((b) => decode(b.content)).catch((e) => { blobs.delete(sha); throw e; }));
    }
    return blobs.get(sha);
  }

  // The id git gives a file's content, worked out here, so a note just saved needn't be downloaded again.
  async function gitBlobSha(text) {
    const bytes = new TextEncoder().encode(text);
    const head = new TextEncoder().encode(`blob ${bytes.length}\0`);
    const all = new Uint8Array(head.length + bytes.length);
    all.set(head);
    all.set(bytes, head.length);
    return [...new Uint8Array(await crypto.subtle.digest('SHA-1', all))].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  const toBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

  // The newest state of the branch this page has read: its commit, every note, and content/posts.json.
  let repo = null;
  async function loadRepo() {
    const head = (await gh(`/git/ref/heads/${BRANCH}`)).object.sha;
    if (repo && repo.head === head) return repo;
    const commit = await gh(`/git/commits/${head}`);
    const tree = (await gh(`/git/trees/${commit.tree.sha}?recursive=1`)).tree.filter((e) => e.type === 'blob');
    const notes = tree.filter((e) => isPost(e.path));
    const json = tree.find((e) => e.path === POSTS_JSON);
    const [texts, postsJson] = await Promise.all([Promise.all(notes.map((e) => blobText(e.sha))), json ? blobText(json.sha) : null]);
    repo = {
      head,
      treeSha: commit.tree.sha,
      paths: new Set(tree.map((e) => e.path)),
      files: new Map(notes.map((e, i) => [e.path, { sha: e.sha, text: texts[i] }])),
      postsJson,
    };
    return repo;
  }

  const uploaded = new Map(); // image path → blob sha, so a save that starts over doesn't upload twice
  async function uploadImage(path) {
    if (!uploaded.has(path)) {
      const content = await toBase64(pending.get(path).blob);
      uploaded.set(path, (await gh('/git/blobs', 'POST', { content, encoding: 'base64' })).sha);
    }
    return uploaded.get(path);
  }

  // One commit on the branch. `change(repo)` says which notes to write and remove and which images
  // to add, or returns null when there is nothing to do; content/posts.json is rebuilt to match.
  // If something else was committed in the meantime, it starts over once from that newer state
  // rather than overwrite it.
  async function commit(message, change) {
    for (let attempt = 0; ; attempt += 1) {
      const r = await loadRepo();
      const c = await change(r);
      if (!c) return null;
      const texts = new Map([...r.files].map(([p, f]) => [p, f.text]));
      c.write.forEach((w) => texts.set(w.path, w.text));
      c.remove.forEach((p) => texts.delete(p));
      let json;
      try {
        json = NB.buildPostsJson([...texts].map(([p, text]) => ({ name: fileName(p), text })), today());
      } catch (e) {
        if (e instanceof NB.DuplicateSlug) throw new DeskError('duplicate', { slug: e.slug, first: e.first, second: e.second });
        throw e;
      }
      const tree = [
        ...c.write.map((w) => ({ path: w.path, mode: '100644', type: 'blob', content: w.text })),
        ...c.remove.map((p) => ({ path: p, mode: '100644', type: 'blob', sha: null })),
      ];
      if (json !== r.postsJson) tree.push({ path: POSTS_JSON, mode: '100644', type: 'blob', content: json });
      for (const p of c.images) tree.push({ path: p, mode: '100644', type: 'blob', sha: await uploadImage(p) });
      const t = await gh('/git/trees', 'POST', { base_tree: r.treeSha, tree });
      const made = await gh('/git/commits', 'POST', { message, tree: t.sha, parents: [r.head] });
      try {
        await gh(`/git/refs/heads/${BRANCH}`, 'PATCH', { sha: made.sha });
      } catch (e) {
        if (e.status === 422 && attempt === 0) continue;
        throw e;
      }
      const files = new Map(r.files);
      for (const w of c.write) {
        const sha = await gitBlobSha(w.text);
        blobs.set(sha, Promise.resolve(w.text));
        files.set(w.path, { sha, text: w.text });
      }
      c.remove.forEach((p) => files.delete(p));
      const paths = new Set([...r.paths, POSTS_JSON, ...c.images, ...c.write.map((w) => w.path)]);
      c.remove.forEach((p) => paths.delete(p));
      repo = { head: made.sha, treeSha: t.sha, paths, files, postsJson: json };
      return { json, jsonChanged: json !== r.postsJson };
    }
  }

  /* ---------- notes ---------- */

  let notes = null;    // every note on GitHub, newest first, drafts included
  let listError = null;
  let open = null;     // the note in the editor: { path (null while new), sha, text, draft, saved: its fields on GitHub }
  let slugEdited = false;
  let busy = false;
  let notice = null;   // { say, kind, vars, action } or { err } — kept so it can be shown again in another language
  const pending = new Map(); // image path → { blob, url }: added to a note, uploaded with the next save

  function notesOf(r) {
    return [...r.files].map(([path, f]) => {
      const p = NB.buildPost(fileName(path), f.text, today());
      return { path, title: p.title, date: p.date, slug: p.slug, draft: p._draft };
    }).sort((a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : a.slug < b.slug ? 1 : -1));
  }

  const blank = () => ({ title: '', date: today(), tags: '', excerpt: '', slug: '', body: '' });
  function fieldsOf(path, text) {
    const [meta, body] = NB.parseFrontMatter(text);
    const p = NB.buildPost(fileName(path), text, today());
    return { title: p.title, date: p.date, tags: p.tags.join(', '), excerpt: NB.unquote(meta.excerpt), slug: p.slug, body: body.replace(/^\n+/, '') };
  }
  const fields = () => ({ title: F.title.value, date: F.date.value, tags: F.tags.value, excerpt: F.excerpt.value, slug: F.slug.value, body: F.body.value });
  function fill(f) { Object.keys(F).forEach((k) => { F[k].value = f[k] || ''; }); }
  // Same note, ignoring what saving tidies up anyway (spaces around values, blank lines at the end).
  const norm = (f) => [f.title.trim(), f.date, tagList(f.tags).join(','), f.excerpt.trim(), f.slug.trim(), f.body.replace(/\s+$/u, '')].join('\u0000');
  const isDirty = () => !!open && norm(fields()) !== norm(open.saved);

  // The note's file: front matter, a blank line, the text. Front-matter lines the editor doesn't
  // manage (a cover, a slug, a comment) are kept as written.
  const MANAGED = ['title', 'date', 'tags', 'draft', 'excerpt'];
  const keyOf = (line) => {
    const s = NB.strip(line);
    return s && !s.startsWith('#') && s.includes(':') ? NB.strip(s.slice(0, s.indexOf(':'))).toLowerCase() : null;
  };
  const sameValue = {
    tags: (a, b) => NB.asTags(a).join('\n') === NB.asTags(b).join('\n'),
    draft: (a, b) => NB.asBool(a) === NB.asBool(b),
  };
  function setLine(head, k, value) {
    const at = head.map((line, i) => (keyOf(line) === k ? i : -1)).filter((i) => i >= 0);
    if (value === null) return head.filter((line, i) => !at.includes(i));
    const last = at.length ? at[at.length - 1] : -1;
    const out = head.slice();
    if (last < 0) out.push(`${k}: ${value}`);
    else if (!(sameValue[k] || ((a, b) => NB.unquote(a) === NB.unquote(b)))(out[last].slice(out[last].indexOf(':') + 1), value)) out[last] = `${k}: ${value}`;
    // build_posts.py reads the last line for a key, so earlier ones only cause confusion
    return out.filter((line, i) => i === last || !at.includes(i));
  }
  // build_posts.py strips one pair of matching quotes, so a value that is itself quoted gets the other
  // kind around it. A value with ": " in it is quoted too, the way YAML front matter usually looks.
  function quoted(v) {
    if (v.length >= 2 && v[0] === v[v.length - 1] && (v[0] === '"' || v[0] === "'")) return v[0] === '"' ? `'${v}'` : `"${v}"`;
    return /:\s/.test(v) && !v.includes('"') ? `"${v}"` : v;
  }
  function noteText(base, f, draft) {
    const lines = base.replace(/\r\n/g, '\n').split('\n');
    const end = NB.strip(lines[0]) === '---' ? lines.findIndex((line, i) => i > 0 && NB.strip(line) === '---') : -1;
    let head = end > 0 ? lines.slice(1, end) : [];
    const tags = tagList(f.tags);
    const want = {
      title: quoted(f.title.trim()),
      date: f.date,
      tags: tags.length ? `[${tags.join(', ')}]` : null,
      draft: String(draft),
      excerpt: f.excerpt.trim() ? quoted(f.excerpt.trim()) : null,
    };
    MANAGED.forEach((k) => { head = setLine(head, k, want[k]); });
    const body = f.body.replace(/\s+$/u, '');
    return `---\n${head.join('\n')}\n---\n\n${body}${body ? '\n' : ''}`;
  }

  /* ---------- the page ---------- */

  function setNotice(say, kind = '', vars, action) {
    notice = say ? { say, kind, vars, action } : null;
    renderNotice();
  }
  const showError = (err) => { notice = { err, kind: 'error' }; renderNotice(); };

  function renderNotice() {
    el.notice.className = `notice${notice && notice.kind ? ` is-${notice.kind}` : ''}`;
    el.notice.textContent = notice ? (notice.err ? explain(notice.err) : format(T(L[notice.say]), notice.vars)) : isDirty() ? T(L.unsaved) : '';
    if (notice && notice.action) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = T(L[notice.action.label]);
      b.addEventListener('click', notice.action.run);
      el.notice.appendChild(b);
    }
  }

  function renderList() {
    if (!notes) {
      el.list.innerHTML = `<p class="status">${esc(listError ? explain(listError) : T(L.loading))}</p>`;
      return;
    }
    el.list.innerHTML = notes.length ? notes.map((n) => {
      const current = !!open && open.path === n.path;
      const changed = current ? isDirty() : !!unsaved.get(n.path);
      return `<button type="button" class="note-item" data-path="${esc(n.path)}" aria-current="${current}">
        <span class="note-item-meta">${esc(window.siteFormatDate(n.date))}${n.draft ? `<span class="state-tag is-draft">${esc(T(L.stateDraft))}</span>` : ''}${changed ? `<span class="unsaved" title="${esc(T(L.unsaved))}">●</span>` : ''}</span>
        <span class="note-item-title">${esc(n.title || T(L.untitled))}</span>
      </button>`;
    }).join('') : `<p class="status">${esc(T(L.empty))}</p>`;
  }

  function renderState() {
    const fresh = !open.path;
    const live = !fresh && !open.draft;
    el.state.className = `state ${fresh ? 'is-new' : live ? 'is-live' : 'is-draft'}`;
    el.state.textContent = T(fresh ? L.stateNew : live ? L.stateLive : L.stateDraft);
    el.draft.textContent = T(live ? L.unpublish : L.saveDraft);
    el.publish.textContent = T(live ? L.update : L.publish);
    el.del.hidden = fresh;
    el.slugField.hidden = !fresh;
    el.viewLive.hidden = !live;
    if (live) el.viewLive.href = `thought.html?slug=${encodeURIComponent(open.saved.slug)}`;
  }

  // The preview is drawn with the article page's own classes, so it looks as it will on the site.
  let previewTimer = 0;
  function renderPreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      const f = fields();
      const html = NB.markdownToHtml(f.body).trim();
      let shown = html;
      pending.forEach((img, path) => { shown = shown.split(`src="${path}"`).join(`src="${img.url}"`); });
      const tags = tagList(f.tags).map((t) => `<span class="tag tag-accent">${esc(t)}</span>`).join('');
      el.preview.innerHTML = `<div class="article">
        <span class="kicker">${esc(window.siteFormatDate(f.date))}</span>
        <h1 class="article-title">${esc(f.title.trim() || T(L.untitled))}</h1>
        ${tags ? `<div class="post-tags">${tags}</div>` : ''}
        <div class="article-prose">${shown}</div>
      </div>`;
      // Without a summary of its own, the list shows the start of the first paragraph.
      F.excerpt.placeholder = NB.autoExcerpt(html);
    }, 80);
  }

  function render() {
    renderList();
    renderState();
    renderNotice();
    renderPreview();
  }

  function translate() {
    document.querySelectorAll('[data-ph]').forEach((n) => { n.placeholder = T(PH[n.dataset.ph]); });
    document.querySelectorAll('[data-tool], [data-tip]').forEach((n) => {
      const tip = format(T(TIPS[n.dataset.tool || n.dataset.tip]), { mod: MOD });
      n.setAttribute('aria-label', tip);
      if (n.tagName === 'BUTTON') n.title = tip;
    });
    el.who.textContent = `@${login}`;
    el.connectMsg.textContent = connectError ? explain(connectError) : '';
  }

  function setBusy(on) {
    busy = on;
    el.editor.setAttribute('aria-busy', String(on));
    [el.draft, el.publish, el.del, el.newNote, el.reload].forEach((b) => { b.disabled = on; });
  }

  // Confirm with the person at the desk; resolves true or false.
  let asking = null;
  function ask(d, vars) {
    return new Promise((resolve) => {
      el.dialogTitle.textContent = format(T(d.title), vars);
      el.dialogBody.textContent = format(T(d.body), vars);
      el.dialogOk.textContent = T(d.ok);
      el.dialogCancel.textContent = T(L.cancel);
      el.dialogOk.classList.toggle('is-danger', !!d.danger);
      const session = {};
      asking = session;
      const finish = (ok) => {
        if (asking !== session) return;
        asking = null;
        if (el.dialog.open) el.dialog.close();
        resolve(ok);
      };
      el.dialogOk.onclick = () => finish(true);
      el.dialogCancel.onclick = () => finish(false);
      el.dialog.oncancel = () => finish(false); // Esc
      // Closed some other way. The close event comes a moment after closing, so one left over from
      // the previous question can land while this one is open: that one is ignored.
      el.dialog.onclose = () => { if (!el.dialog.open) finish(false); };
      el.dialog.showModal();
      el.dialogCancel.focus();
    });
  }

  /* ---------- opening, saving, deleting ---------- */

  // Changes not yet saved to GitHub are kept in this browser, so a closed tab or a crash loses nothing.
  let keepTimer = 0;
  function keep() {
    clearTimeout(keepTimer);
    if (!open) return;
    const id = open.path || 'new';
    if (isDirty()) unsaved.set(id, { fields: fields(), sha: open.sha, slugEdited, at: Date.now() });
    else unsaved.clear(id);
  }

  let watching = 0;
  function openNote(path) {
    keep();
    watching += 1;
    const file = path && repo && repo.files.get(path);
    const saved = file ? fieldsOf(path, file.text) : blank();
    open = {
      path: file ? path : null,
      sha: file ? file.sha : null,
      text: file ? file.text : '',
      draft: file ? NB.buildPost(fileName(path), file.text, today())._draft : true,
      saved,
    };
    slugEdited = false;
    notice = null;
    const id = open.path || 'new';
    const kept = unsaved.get(id);
    if (kept && norm(kept.fields) !== norm(saved)) {
      fill(kept.fields);
      // Saved against an older version? Then saving asks before replacing the newer one.
      if (open.path) open.sha = kept.sha;
      slugEdited = !!kept.slugEdited;
      const time = new Date(kept.at).toLocaleString(document.documentElement.lang, { dateStyle: 'medium', timeStyle: 'short' });
      // Discarding puts GitHub's version back in the fields; reopening then finds nothing left to keep.
      notice = { say: 'restored', kind: '', vars: { time }, action: { label: 'discard', run: () => { fill(saved); openNote(open.path); } } };
    } else {
      if (kept) unsaved.clear(id);
      fill(saved);
    }
    lastDirty = isDirty();
    history.replaceState(null, '', open.path ? `?slug=${encodeURIComponent(saved.slug)}` : '?new=1');
    render();
  }

  async function save(publish) {
    if (busy || !open) return;
    const f = fields();
    const fresh = !open.path;
    const slug = f.slug.trim();
    const problem = !f.title.trim() ? ['needTitle', F.title]
      : !/^\d{4}-\d{2}-\d{2}$/.test(f.date) ? ['needDate', F.date]
        : fresh && !SLUG.test(slug) ? ['badSlug', F.slug]
          : fresh && notes && notes.some((n) => n.slug === slug) ? ['slugTaken', F.slug] : null;
    if (problem) {
      setNotice(problem[0], 'error');
      problem[1].focus();
      return;
    }
    const path = fresh ? `${POSTS}${f.date}-${slug}.md` : open.path;
    const wasDraft = open.draft;
    const verb = publish ? (wasDraft ? 'Publish' : 'Update') : wasDraft ? 'Save draft' : 'Unpublish';
    const images = [...pending.keys()].filter((p) => f.body.includes(p));
    let text = '';
    let replace = false;
    setBusy(true);
    setNotice('saving');
    try {
      const done = await commit(`${verb}: ${f.title.trim()}`, async (r) => {
        const current = r.files.get(path);
        if (fresh && (current || notesOf(r).some((n) => n.slug === slug))) throw new DeskError('slugTaken');
        if (!fresh && !replace && (current ? current.sha : null) !== open.sha) {
          if (!(await ask(current ? ASK.changed : ASK.vanished))) throw new DeskError(null);
          replace = true;
        }
        text = noteText(current ? current.text : open.text, f, !publish);
        return { write: [{ path, text }], remove: [], images };
      });
      unsaved.clear(fresh ? 'new' : path);
      open = { path, sha: repo.files.get(path).sha, text, draft: !publish, saved: fieldsOf(path, text) };
      slugEdited = false;
      lastDirty = isDirty();
      notes = notesOf(repo);
      history.replaceState(null, '', `?slug=${encodeURIComponent(open.saved.slug)}`);
      setNotice(publish ? (wasDraft ? 'published' : 'updated') : wasDraft ? 'draftSaved' : 'unpublished', 'ok');
      render();
      if (done.jsonChanged) watchLive(done.json, publish ? 'live' : 'gone');
    } catch (err) {
      if (err instanceof DeskError && !err.say) setNotice(null);
      else showError(err);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy || !open || !open.path) return;
    const path = open.path;
    const title = F.title.value.trim() || open.saved.title;
    if (!(await ask(ASK.remove, { title }))) return;
    setBusy(true);
    setNotice('deleting');
    try {
      const done = await commit(`Delete note: ${title}`, async (r) => (r.files.has(path) ? { write: [], remove: [path], images: [] } : null));
      unsaved.clear(path);
      notes = notesOf(repo);
      open = null;
      openNote(null);
      setNotice('deleted', 'ok');
      if (done && done.jsonChanged) watchLive(done.json, 'gone');
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  }

  // On the real site, wait for GitHub Pages to publish the new posts.json and say so.
  async function watchLive(json, say) {
    if (!LIVE) return;
    const id = ++watching;
    for (let i = 0; i < 36; i++) {
      await delay(5000);
      if (id !== watching) return;
      try {
        const r = await fetch(`${POSTS_JSON}?t=${Date.now()}`, { cache: 'no-store' });
        if (r.ok && (await r.text()) === json) {
          if (id === watching && !busy && !isDirty()) setNotice(say, 'ok');
          return;
        }
      } catch (e) {}
    }
    if (id === watching && !busy && !isDirty()) setNotice('slow');
  }

  async function reload() {
    if (busy) return;
    setBusy(true);
    try {
      await loadRepo();
      notes = notesOf(repo);
      listError = null;
      // The open note follows GitHub unless it has changes of its own here.
      if (open && !isDirty()) openNote(open.path);
      else render();
    } catch (err) {
      if (err.status === 401) signOut(err);
      else showError(err);
    } finally {
      setBusy(false);
    }
  }

  /* ---------- writing ---------- */

  let lastDirty = false;
  function changed(e) {
    if (!open) return;
    if (e && e.target === F.slug) slugEdited = true;
    if (!open.path && !slugEdited) F.slug.value = slugify(F.title.value);
    notice = null;
    renderNotice();
    renderPreview();
    const dirty = isDirty();
    if (dirty !== lastDirty) { lastDirty = dirty; renderList(); }
    clearTimeout(keepTimer);
    keepTimer = setTimeout(keep, 500);
  }
  Object.values(F).forEach((input) => input.addEventListener('input', changed));

  // Typing through the browser keeps ⌘Z working; setRangeText is the fallback.
  function replaceSelection(text, selectFrom, selectTo) {
    const start = F.body.selectionStart;
    F.body.focus();
    if (!document.execCommand('insertText', false, text)) {
      F.body.setRangeText(text, F.body.selectionStart, F.body.selectionEnd, 'end');
      changed();
    }
    if (selectFrom != null) F.body.setSelectionRange(start + selectFrom, start + (selectTo == null ? selectFrom : selectTo));
  }
  const selection = () => F.body.value.slice(F.body.selectionStart, F.body.selectionEnd);
  function wrap(before, after = before) {
    const s = selection();
    replaceSelection(before + s + after, before.length, before.length + s.length);
  }
  // Starts (or, when every line has it, removes) a marker at the beginning of each selected line.
  const ANY_MARK = /^(#{1,6}\s+|>\s?|[-*+]\s+|\d+[.)]\s+)/;
  function mark(own, make) {
    const v = F.body.value;
    const start = v.lastIndexOf('\n', F.body.selectionStart - 1) + 1;
    let end = F.body.selectionEnd;
    if (end > start && v[end - 1] === '\n') end -= 1;
    end = v.indexOf('\n', end);
    if (end < 0) end = v.length;
    const rows = v.slice(start, end).split('\n');
    const filled = rows.filter((row) => row.trim());
    const off = filled.length > 0 && filled.every((row) => own.test(row));
    const out = filled.length
      ? rows.map((row, i) => (!row.trim() ? row : off ? row.replace(own, '') : make(i) + row.replace(ANY_MARK, ''))).join('\n')
      : make(0);
    F.body.setSelectionRange(start, end);
    replaceSelection(out, out.length);
  }
  const TOOLS = {
    bold: () => wrap('**'),
    italic: () => wrap('*'),
    heading: () => mark(/^#{1,6}\s+/, () => '## '),
    quote: () => mark(/^>\s?/, () => '> '),
    list: () => mark(/^[-*+]\s+/, () => '- '),
    numbered: () => mark(/^\d+[.)]\s+/, (i) => `${i + 1}. `),
    code: () => (selection().includes('\n') ? wrap('```\n', '\n```') : wrap('`')),
    link: () => {
      const s = selection();
      if (s) replaceSelection(`[${s}](https://)`, s.length + 3, s.length + 11);
      else replaceSelection('[](https://)', 1);
    },
    image: () => el.imageFile.click(),
  };
  el.toolbar.addEventListener('mousedown', (e) => { if (e.target.closest('.tool')) e.preventDefault(); }); // keep the text's selection
  el.toolbar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tool]');
    if (b && open) TOOLS[b.dataset.tool]();
  });
  F.body.addEventListener('keydown', (e) => {
    if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
    const tool = { b: 'bold', i: 'italic', k: 'link' }[e.key.toLowerCase()];
    if (tool) { e.preventDefault(); TOOLS[tool](); }
  });
  // ⌘S saves the note as it stands: a draft stays a draft, a published note is updated.
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 's' && open && !el.desk.hidden) {
      e.preventDefault();
      save(!open.draft);
    }
  });

  // Photos straight from a phone are huge; 1600 px on the long side is plenty for a note.
  async function prepareImage(file) {
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/avif': 'avif', 'image/svg+xml': 'svg' }[file.type];
    if (!ext) throw new DeskError('imageBad');
    if (file.size > 20e6) throw new DeskError('imageBig');
    if (!['jpg', 'png', 'webp'].includes(ext)) return { blob: file, ext };
    let bmp;
    try { bmp = await createImageBitmap(file); } catch (e) { throw new DeskError('imageBad'); }
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    if (scale === 1 && (ext === 'png' || file.size <= 1.5e6)) { bmp.close(); return { blob: file, ext }; }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const type = ext === 'png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.85));
    if (!blob) throw new DeskError('imageBad');
    return { blob, ext: ext === 'png' ? 'png' : 'jpg' };
  }
  function imagePath(name, ext) {
    const base = slugify(name.replace(/\.[^.]*$/, '')).replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '') || 'image';
    const date = /^\d{4}-\d{2}-\d{2}$/.test(F.date.value) ? F.date.value : today();
    for (let n = 1; ; n += 1) {
      const path = `${IMAGES}${date}-${base}${n > 1 ? `-${n}` : ''}.${ext}`;
      if (!(repo && repo.paths.has(path)) && !pending.has(path)) return path;
    }
  }
  el.imageFile.addEventListener('change', async () => {
    const file = el.imageFile.files[0];
    el.imageFile.value = '';
    if (!file || !open) return;
    try {
      const img = await prepareImage(file);
      const path = imagePath(file.name, img.ext);
      pending.set(path, { blob: img.blob, url: URL.createObjectURL(img.blob) });
      // On a paragraph of its own, with the caret where its description goes.
      const v = F.body.value;
      const at = F.body.selectionStart;
      const before = at === 0 || v.slice(0, at).endsWith('\n\n') ? '' : v.slice(0, at).endsWith('\n') ? '\n' : '\n\n';
      const after = v.slice(F.body.selectionEnd).startsWith('\n\n') ? '' : '\n\n';
      replaceSelection(`${before}![](${path})${after}`, before.length + 2);
      setNotice('imageAdded', 'ok');
    } catch (err) {
      showError(err);
    }
  });

  // Write | Both | Preview. "Both" needs a wide screen; the choice is remembered.
  const wide = window.matchMedia('(min-width: 1280px)');
  function applyView() {
    let v = null;
    try { v = localStorage.getItem(VIEW); } catch (e) {}
    if (!['write', 'split', 'preview'].includes(v)) v = 'split';
    if (v === 'split' && !wide.matches) v = 'write';
    el.panes.dataset.view = v;
    document.querySelectorAll('input[name="view"]').forEach((input) => { input.checked = input.value === v; });
  }
  document.querySelectorAll('input[name="view"]').forEach((input) => input.addEventListener('change', () => {
    if (!input.checked) return;
    try { localStorage.setItem(VIEW, input.value); } catch (e) {}
    applyView();
  }));
  wide.addEventListener('change', applyView);
  // Side by side, the preview follows the text as it scrolls.
  F.body.addEventListener('scroll', () => {
    if (el.panes.dataset.view !== 'split') return;
    const max = F.body.scrollHeight - F.body.clientHeight;
    el.preview.scrollTop = max > 0 ? (F.body.scrollTop / max) * (el.preview.scrollHeight - el.preview.clientHeight) : 0;
  });

  /* ---------- connecting ---------- */

  let connectError = null;

  async function start() {
    el.connect.hidden = true;
    el.desk.hidden = false;
    el.signOut.hidden = false;
    el.localNote.hidden = LIVE;
    gh('https://api.github.com/user').then((u) => {
      login = u.login;
      el.who.hidden = false;
      translate();
    }).catch(() => {});
    notes = null;
    listError = null;
    renderList();
    try {
      await loadRepo();
      notes = notesOf(repo);
    } catch (err) {
      if (err.status === 401) { signOut(err); return; }
      listError = err;
    }
    const slug = new URLSearchParams(location.search).get('slug');
    const hit = slug && notes && notes.find((n) => n.slug === slug);
    openNote(hit ? hit.path : null);
    if (listError) showError(listError);
  }

  function signOut(err) {
    keep();
    keyStore.clear();
    key = '';
    login = '';
    open = null;
    repo = null;
    notes = null;
    blobs.clear();
    connectError = err || null;
    el.desk.hidden = true;
    el.signOut.hidden = true;
    el.who.hidden = true;
    el.connect.hidden = false;
    translate();
  }

  el.connectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = el.keyInput.value.trim();
    if (!value || busy) return;
    key = value;
    busy = true;
    el.connectBtn.disabled = true;
    connectError = null;
    translate();
    try {
      // Proves the key may save here by writing an empty loose object: no commit, nothing visible.
      await gh('/git/blobs', 'POST', { content: '', encoding: 'utf-8' });
      keyStore.set(value, el.remember.checked);
      el.keyInput.value = '';
      busy = false;
      await start();
    } catch (err) {
      key = '';
      connectError = err;
      translate();
    } finally {
      busy = false;
      el.connectBtn.disabled = false;
    }
  });

  el.list.addEventListener('click', (e) => {
    const item = e.target.closest('.note-item');
    if (item && !busy && (!open || item.dataset.path !== open.path)) openNote(item.dataset.path);
  });
  el.newNote.addEventListener('click', () => {
    if (busy) return;
    openNote(null);
    F.title.focus();
  });
  el.draft.addEventListener('click', () => save(false));
  el.publish.addEventListener('click', () => save(true));
  el.del.addEventListener('click', remove);
  el.reload.addEventListener('click', reload);
  el.signOut.addEventListener('click', () => signOut(null));
  window.addEventListener('pagehide', keep);
  window.addEventListener('beforeunload', (e) => {
    if (!isDirty() && !busy) return;
    keep();
    e.preventDefault();
    e.returnValue = '';
  });
  document.addEventListener('langchange', () => {
    translate();
    if (open) render();
    else renderList();
  });

  translate();
  applyView();
  key = keyStore.get();
  if (key) start();
  else el.connect.hidden = false;
})();
