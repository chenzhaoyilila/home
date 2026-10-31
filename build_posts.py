#!/usr/bin/env python3
"""
Build the site's post data from the Markdown files in content/posts/.

    python3 build_posts.py

Writes two files:

    content/posts.json          published posts only — committed and deployed
    content/posts.preview.json  every post, drafts included — local only, gitignored

A post whose front matter says `draft: true` is written ONLY to the preview
file, so an unfinished note cannot reach the live site by accident. Preview
locally at  http://localhost:5510/index.html?preview=1

Front matter (between --- fences at the top of the file):

    title:    required
    date:     YYYY-MM-DD  (falls back to the filename prefix, then file mtime)
    tags:     [日记, 想法]  or  日记, 想法
    draft:    true | false      (default false)
    excerpt:  optional — auto-generated from the first paragraph if omitted
    cover:    optional — e.g. content/images/photo.jpg
    slug:     optional — defaults to the filename without its date prefix

Markdown: blank line = new paragraph, single newline = line break.
Stdlib only — no pip install, no venv activation needed.
"""

import datetime
import html
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent
POSTS_DIR = ROOT / "content" / "posts"
OUT_PUBLISHED = ROOT / "content" / "posts.json"
OUT_PREVIEW = ROOT / "content" / "posts.preview.json"

BLOCK_START = re.compile(r"^(#{1,6}\s|[-*+]\s|\d+[.)]\s|>|```)")
HR = re.compile(r"^(-{3,}|\*{3,}|_{3,})$")


# ---------------------------------------------------------------- front matter
def parse_front_matter(text):
    lines = text.replace("\r\n", "\n").split("\n")
    if not lines or lines[0].strip() != "---":
        return {}, text
    end = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end = i
            break
    if end is None:
        return {}, text
    meta = {}
    for line in lines[1:end]:
        line = line.strip()
        if not line or line.startswith("#") or ":" not in line:
            continue
        key, _, value = line.partition(":")
        meta[key.strip().lower()] = value.strip()
    return meta, "\n".join(lines[end + 1:])


def unquote(v):
    v = (v or "").strip()
    if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
        return v[1:-1]
    return v


def as_bool(v):
    return unquote(v).lower() in ("true", "yes", "1", "on")


def as_tags(v):
    v = (v or "").strip()
    if v.startswith("[") and v.endswith("]"):
        v = v[1:-1]
    return [unquote(t) for t in v.split(",") if unquote(t)]


# -------------------------------------------------------------------- markdown
def inline(text):
    out = html.escape(text, quote=False)
    out = re.sub(r"!\[([^\]]*)\]\(([^)\s]+)\)",
                 r'<img src="\2" alt="\1" loading="lazy">', out)
    out = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", r'<a href="\2">\1</a>', out)
    out = re.sub(r"`([^`]+)`", r"<code>\1</code>", out)
    out = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", out)
    out = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"<em>\1</em>", out)
    return out


def markdown_to_html(md):
    lines = md.replace("\r\n", "\n").split("\n")
    blocks, i, n = [], 0, len(lines)

    while i < n:
        cur = lines[i].strip()
        if not cur:
            i += 1
            continue

        if cur.startswith("```"):                       # fenced code
            i += 1
            buf = []
            while i < n and lines[i].strip() != "```":
                buf.append(lines[i])
                i += 1
            i += 1
            blocks.append("<pre><code>%s</code></pre>"
                          % html.escape("\n".join(buf), quote=False))
            continue

        if cur.startswith("<"):                         # raw HTML passthrough
            buf = []
            while i < n and lines[i].strip():
                buf.append(lines[i])
                i += 1
            blocks.append("\n".join(buf))
            continue

        m = re.match(r"^(#{1,6})\s+(.*)$", cur)         # heading
        if m:
            lvl = len(m.group(1))
            blocks.append("<h%d>%s</h%d>" % (lvl, inline(m.group(2).strip()), lvl))
            i += 1
            continue

        if HR.match(cur):                               # horizontal rule
            blocks.append("<hr>")
            i += 1
            continue

        if cur.startswith(">"):                         # blockquote
            buf = []
            while i < n and lines[i].strip().startswith(">"):
                buf.append(lines[i].strip()[1:].strip())
                i += 1
            blocks.append("<blockquote><p>%s</p></blockquote>"
                          % "<br>".join(inline(x) for x in buf if x))
            continue

        if re.match(r"^[-*+]\s+", cur):                 # unordered list
            items = []
            while i < n and re.match(r"^[-*+]\s+", lines[i].strip()):
                items.append(inline(re.sub(r"^[-*+]\s+", "", lines[i].strip())))
                i += 1
            blocks.append("<ul>%s</ul>" % "".join("<li>%s</li>" % x for x in items))
            continue

        if re.match(r"^\d+[.)]\s+", cur):               # ordered list
            items = []
            while i < n and re.match(r"^\d+[.)]\s+", lines[i].strip()):
                items.append(inline(re.sub(r"^\d+[.)]\s+", "", lines[i].strip())))
                i += 1
            blocks.append("<ol>%s</ol>" % "".join("<li>%s</li>" % x for x in items))
            continue

        buf = []                                        # paragraph
        while i < n:
            line = lines[i].strip()
            if not line or BLOCK_START.match(line) or HR.match(line):
                break
            buf.append(line)
            i += 1
        if buf:
            blocks.append("<p>%s</p>" % "<br>".join(inline(x) for x in buf))

    return "".join(blocks)


# ------------------------------------------------------------------ post build
def auto_excerpt(body_html, limit=100):
    m = re.search(r"<p>(.*?)</p>", body_html, re.S)
    if not m:
        return ""
    text = re.sub(r"<[^>]+>", "", m.group(1))
    text = html.unescape(text).replace("\n", " ").strip()
    return text if len(text) <= limit else text[:limit].rstrip() + "…"


def build_post(path):
    raw = path.read_text(encoding="utf-8")
    meta, body_md = parse_front_matter(raw)
    stem = path.stem

    date = unquote(meta.get("date", ""))
    name = stem
    m = re.match(r"^(\d{4}-\d{2}-\d{2})[-_]?(.*)$", stem)
    if m:
        date = date or m.group(1)
        name = m.group(2) or m.group(1)
    if not date:
        date = datetime.date.fromtimestamp(path.stat().st_mtime).isoformat()

    # A file named *.draft.md is always a draft and is gitignored, so its text
    # never leaves this machine. `draft: true` only keeps it off the website.
    forced_draft = path.name.endswith(".draft.md")
    if forced_draft:
        name = re.sub(r"\.draft$", "", name)

    title = unquote(meta.get("title", "")) or name
    body_html = markdown_to_html(body_md).strip()
    cover = unquote(meta.get("cover", "")) or None

    return {
        "slug": unquote(meta.get("slug", "")) or name,
        "title": title,
        "date": date,
        "excerpt": unquote(meta.get("excerpt", "")) or auto_excerpt(body_html),
        "tags": as_tags(meta.get("tags", "")),
        "coverImage": cover,
        "bodyHtml": body_html,
        "_draft": forced_draft or as_bool(meta.get("draft", "")),
        "_file": path.name,
    }


def main():
    if not POSTS_DIR.is_dir():
        sys.exit("No %s directory — create it and add a .md file." % POSTS_DIR)

    files = sorted(POSTS_DIR.glob("*.md"))
    if not files:
        sys.exit("No .md files in %s" % POSTS_DIR)

    posts, seen = [], {}
    for f in files:
        p = build_post(f)
        if p["slug"] in seen:
            sys.exit("Duplicate slug %r in %s and %s — set a unique `slug:` in "
                     "the front matter." % (p["slug"], seen[p["slug"]], f.name))
        seen[p["slug"]] = f.name
        posts.append(p)

    posts.sort(key=lambda p: (p["date"], p["slug"]), reverse=True)

    def clean(items, keep_draft=False):
        out = []
        for p in items:
            d = {k: v for k, v in p.items() if not k.startswith("_")}
            if keep_draft:
                d["draft"] = p["_draft"]
            out.append(d)
        return out

    published = [p for p in posts if not p["_draft"]]
    drafts = [p for p in posts if p["_draft"]]

    OUT_PUBLISHED.write_text(
        json.dumps({"posts": clean(published)}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8")
    OUT_PREVIEW.write_text(
        json.dumps({"posts": clean(posts, keep_draft=True)},
                   ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8")

    print("posts.json          %d published" % len(published))
    print("posts.preview.json  %d total (%d draft)" % (len(posts), len(drafts)))
    for p in posts:
        print("  %s  %s  %s" % ("DRAFT " if p["_draft"] else "live  ",
                                p["date"], p["title"]))
    if drafts:
        print("\nDrafts stay local. Preview: "
              "http://localhost:5510/index.html?preview=1")


if __name__ == "__main__":
    main()
