# Copenhagen

可直接上传 GitHub 的完整网页游戏：prologue / 第一幕（英文界面显示 Act I）。
包含目前线上最新版本的人物比例、前景树木与停放自行车、平滑台阶和中英文目录。
全部图片、人物动画、背景音乐及音效均已包含。纯 HTML / JavaScript / Canvas，无需安装依赖或编译。

## 上传到 GitHub

1. 解压 `Copenhagen-GitHub.zip`，打开其中的 `Copenhagen` 文件夹。
2. 在 GitHub 创建或打开目标仓库，选择 **Add file → Upload files**。
3. 上传 `Copenhagen` 文件夹里的全部内容，保留 `assets` 文件夹结构。让 `index.html` 直接位于仓库首页，不要只上传 ZIP，也不要再套一层 Copenhagen 文件夹。
4. 点击 **Commit changes** 保存。

`.nojekyll` 和 `.gitignore` 是隐藏文件；使用 Finder 时可按 Command + Shift + . 显示。`.nojekyll` 用于直接发布静态文件。

## 用 GitHub Pages 在线运行

只保存代码和素材时，完成上传即可。需要可直接游玩的网页链接时：

1. 打开仓库 **Settings → Pages**。
2. 在 **Build and deployment → Source** 选择 **Deploy from a branch**。
3. Branch 选择实际上传的分支（通常为 `main`），目录选择 **/(root)**，点击 **Save**。
4. 等待发布完成，在 Pages 页面打开生成的网址。

仓库项目站点通常使用 `https://你的用户名.github.io/仓库名/`。本项目使用相对路径，可以在这个子目录下加载素材。
GitHub Free 的 Pages 支持公开仓库；私有仓库的 Pages 可用性取决于账户方案。

发布设置参考：[GitHub 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

## 文件说明

- `index.html`：游戏入口，放在仓库根目录。
- `style.css`：页面、顶部菜单和交互按钮的样式。
- `game.js`：序章、章节衔接、语言、菜单与主流程。
- `act2.js`：人物移动、镜头、台阶与场景事件。
- `scene-art.js`：建筑、树木、自行车和其他场景绘制。
- `act2-audio.js`：环境声、关门和门铃音效。
- `assets/`：人物图片、音乐和音效，需完整上传。

## 操作

- 左右方向键或 A / D：行走。
- E 或门铃按钮：在玻尔家门前按门铃。
- P：暂停 / 继续；R：从序章重新开始；M：静音 / 取消静音。
- 顶部 Chapter：切换 prologue / 第一幕。
- Settings：切换中文 / 英文；Fullscreen：全屏 / 退出全屏。

在线正常入口从序章开始。网址末尾添加 `?act=2` 可从 1941 年 9 月开始试玩行走章节。

## 本地预览

建议通过本地静态服务器预览，以便浏览器加载音频。例如已安装 Python 3 时，在本文件夹运行 `python3 -m http.server 8000`，然后打开 `http://localhost:8000`。
