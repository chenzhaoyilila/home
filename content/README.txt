WRITING POSTS — 写文章
================================================================

You write Markdown in content/posts/. A script turns it into the JSON the
site reads. Drafts stay on your machine until you say so.

你在 content/posts/ 里写 Markdown，脚本把它转成网站读取的 JSON。
草稿在你确认之前不会离开你的电脑。


----------------------------------------------------------------
THE LOOP — 日常流程
----------------------------------------------------------------

1. WRITE — 写
   Create content/posts/2026-08-26-my-note.md

       ---
       title: 今天的记录
       date: 2026-08-26
       tags: [日记]
       draft: true
       ---

       正文从这里开始。

       空行 = 新段落，单个回车 = 换行。

2. BUILD — 生成
       python3 build_posts.py

3. PREVIEW — 预览（只有你看得到）
       http://localhost:5510/index.html?preview=1#notes
   Drafts show a red DRAFT badge and a banner sits at the bottom of the
   screen, so preview can never be mistaken for the live site.
   草稿会带红色 DRAFT 标记，底部有固定横幅，不会和线上版本混淆。

4. PUBLISH — 发布
   Change  draft: true  ->  draft: false, then:
       python3 build_posts.py
       git add -A && git commit -m "新文章" && git push
   Live in about a minute. 大约一分钟后上线。


----------------------------------------------------------------
TWO KINDS OF DRAFT — 两种草稿
----------------------------------------------------------------

  draft: true in the front matter
      Not on the website. The .md file IS committed, so it is backed up —
      but the text is readable in your public GitHub repo.
      不上网站。.md 会被 commit（有备份），但在公开仓库里别人能读到原文。

  filename ending in .draft.md   e.g. 2026-08-27-private.draft.md
      Not on the website AND not committed. Stays only on this machine.
      Use this for anything personal.
      不上网站，也不进 git，只留在你这台电脑上。私人内容用这个。

Either way the post cannot reach the live site: drafts are written only to
content/posts.preview.json, which is gitignored and never deployed.
两种方式都无法上线：草稿只写进 content/posts.preview.json，
该文件已被 gitignore，永远不会被部署。


----------------------------------------------------------------
FRONT MATTER — 字段说明
----------------------------------------------------------------

  title     required 必填
  date      YYYY-MM-DD — falls back to the filename prefix, then file mtime
            可省略，会依次从文件名前缀、文件修改时间推断
  tags      [日记, 想法]  — include "newsletter" to appear under the
            Newsletter filter  写 newsletter 会出现在"通讯"筛选里
  draft     true | false  (default false)
  excerpt   optional — auto-generated from the first paragraph
            可省略，自动取第一段
  cover     optional — content/images/photo.jpg
  slug      optional — the URL id; defaults to the filename without its date

Posts are sorted newest-first automatically. 顺序自动按日期倒序，不用管。


----------------------------------------------------------------
MARKDOWN — 支持的语法
----------------------------------------------------------------

  # 标题 ... ###### 小标题        **粗体**   *斜体*   `行内代码`
  - 无序列表      1. 有序列表      > 引用     ---（分隔线）
  [链接](https://example.com)     ![图片说明](content/images/x.jpg)
  ``` 代码块 ```

  Blank line = new paragraph. Single newline = line break (no stray spaces
  between Chinese characters).
  空行 = 新段落。单个回车 = 换行（中文之间不会多出空格）。

IMAGES 图片: put files in content/images/ then reference them as
content/images/yourfile.jpg


----------------------------------------------------------------
NOTES — 注意
----------------------------------------------------------------

* Run build_posts.py after every edit — the site reads the generated JSON,
  not your .md files. 每次改完都要跑一次脚本，网站读的是生成的 JSON。
* Don't hand-edit content/posts.json; it is overwritten each build.
  不要手改 content/posts.json，每次生成都会覆盖。
* Duplicate slugs are rejected with an error naming both files.
  slug 重复会报错并指出是哪两个文件。
* The script uses only the Python standard library — no pip install needed.
  脚本只用标准库，不需要 pip install。
