# Zhaoyi Chen

Personal website: **https://chenzhaoyilila.github.io/home/**

Economics student. Teaching videos on game theory and finance, with the lecture files behind them — in English and 中文.

## Updating the site · 更新网站

| What · 内容 | How · 方法 |
| --- | --- |
| Portrait · 照片 | Add `content/images/portrait.jpg` (4:5) |
| Video thumbnail · 视频缩略图 | Add `content/images/latest-video.jpg` (16:9) |
| CV · 简历 | Add `resume.pdf` next to `resume.html` |
| Video and playlist links · 视频与播放列表链接 | In `index.html`, search for `EDIT` |
| A new note · 新随笔 | Write it on the website at [write.html](https://chenzhaoyilila.github.io/home/write.html), or in `content/posts/` and run `python3 build_posts.py`. See [content/README.txt](content/README.txt) |

Then publish · 然后发布:

```
git add -A && git commit -m "Update site" && git push
```

The live site updates about a minute later. 大约一分钟后线上生效。

Notes saved on the website are committed straight to GitHub, so run `git pull` before you change anything here. 在网站上保存的随笔会直接提交到 GitHub，所以在本地修改前先运行 `git pull`。

To preview locally, open the folder with a local server (for example VS Code's Live Server) rather than opening the file directly, because the notes load from `content/posts.json`. Add `?preview=1#notes` to the address to see drafts as well.

本地预览请用本地服务器打开（例如 VS Code 的 Live Server），不要直接双击文件，否则随笔无法加载。地址后加 `?preview=1#notes` 可以同时看到草稿。
