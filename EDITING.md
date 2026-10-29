# 编辑网站内容

日常改字只需要编辑 `content.json`。页面的布局、颜色、动效和小绵羊不需要改。

## 最常改的地方

- `hero`：首页的一句话介绍。
- `education`：两段教育经历。
- `experience`：公司、职位、项目和要点。
- `projects`：个人项目、赛事内容和获奖。
- `summary`：页面末尾的个人总结。
- `sheepGuide`：小绵羊滚动到项目时说的话。
- `Qsheep`：小绵羊的台词、互动开关、动作与频率。

## Qsheep 小羊配置

在 `content.json` 靠前的 `Qsheep` 中编辑，保存发布后刷新页面生效。默认值保持目前的表现；不需要改 SVG、动画或页面代码。`_说明` 只给编辑者看，不显示在网站上。

| 字段 | 可以修改什么 |
| --- | --- |
| `name` | 小羊的无障碍名称 |
| `enabled` | 是否显示整只小羊 |
| `interactions` | 各项互动开关，见下表 |
| `actions` | 点击、双击、长按分别触发什么 |
| `timing` | 等待与显示时间，单位均为秒 |
| `messages` | 气泡台词；`greetings` 是轮流使用的问候语列表 |
| `captions` | 清醒、吃草、困倦等状态的小标签 |
| `easterEgg` | 吃完草拉便便的彩蛋开关及概率 |
| `projectGuide` | 项目解说开关和时间；具体解说文字仍在 `sheepGuide` |

### 开关

`true` 开启，`false` 关闭，两者都不要加引号。

| `interactions` 字段 | 含义 |
| --- | --- |
| `followPointer` | 眼睛跟随鼠标 |
| `wandering` | 自主散步 |
| `autoGrass` | 随机长草并去吃；关闭后仍可手动喂草 |
| `autoSleep` | 闲置后打瞌睡 |
| `stroking` | 鼠标在头顶来回移动触发摸头 |
| `dragging` | 拖动、拎起小羊 |
| `hoverGreeting` | 鼠标靠近时打招呼 |
| `readingCelebration` | 读到页尾时的小庆祝 |

关闭散步不会关闭去吃草；希望小羊不自行走动时，同时把 `wandering` 和 `autoGrass` 设为 `false`。

### 动作

动作名称：`greet` 打招呼、`feed` 喂草、`pat` 摸头、`hop` 跳一下、`none` 不触发。

| `actions` 字段 | 含义 |
| --- | --- |
| `click` | 单击小羊（键盘激活也使用此动作） |
| `doubleClick` | 双击小羊，按列表顺序轮流触发 |
| `longPress` | 长按小羊后松开 |
| `blankDoubleClick` | 双击页面空白处，只支持 `feed` 或 `none` |

例如只想双击摸头，将 `doubleClick` 改为 `["pat"]`；关闭双击用 `["none"]`。默认 `["feed", "pat"]` 表示喂草和摸头交替。

### 时间和概率

| `timing` 字段 | 含义 |
| --- | --- |
| `wanderStartSeconds` | 清醒或互动结束后多久尝试散步 |
| `wanderIntervalSeconds` | 散步被阻挡或结束后，再次尝试的间隔 |
| `blinkSeconds` | 自动眨眼的检查间隔 |
| `idleBeforeSleepSeconds` | 闲置多久开始困倦 |
| `sleepSeconds` | 入睡后多久醒来 |
| `speechSeconds` | 普通气泡显示时长 |
| `firstGrassMinSeconds` / `firstGrassMaxSeconds` | 首次长草的随机等待范围 |
| `grassMinSeconds` / `grassMaxSeconds` | 后续长草的随机等待范围 |
| `grassAfterScrollSeconds` | 滚动或调整窗口后重新安排长草的等待时间 |

这些是尝试触发的时间；拖动、进食、阅读项目笔记时会避让，开启系统“减少动态效果”时也会减少自动动作。

`easterEgg.enabled` 控制便便彩蛋。`probability: 0.01` 表示每次完成进食有 **1%** 概率，一次页面访问最多出现一次；填 `0` 永不出现，填 `1` 必定触发（仍遵守次数限制和减少动态效果设置）。

`projectGuide.enabled` 控制整个项目解说功能；`automatic` 只控制是否自动解说，关闭后仍可手动展开。`delaySeconds` 是进入项目后的等待，`durationSeconds` 是自动笔记显示时长，`gapSeconds` 是两次自动解说的最小间隔。手动展开的笔记不会自动收起。

缺失字段或类型填错时会使用默认值；时间限制在 0.5–3600 秒，概率限制在 0–1。请保留 JSON 引号、逗号和括号，不要添加 `//` 注释。

## 文字格式

普通文字直接写。

`**重要词**` 会显示为重点文字。

`[[页面上显示的词|鼠标悬停时的解释]]` 会显示成带解释的术语。例如：

```json
"body": "Built [[100+ Skills|The platform covers more than one hundred Skills.]]."
```

## 新增内容

要新增一个 bullet，复制同一组 `bullets` 里的一个 `{ "label": ..., "body": ... }`，再改文字。注意上一条结尾需要保留逗号。

现有的公司与项目已经各自对应页面上的固定位置，因此日常修改请保留 `id` 不变。要新增一整段经历或一个全新项目时，再请开发者补一个对应的版式位置；普通的文字、日期、数字、bullet 和项目笔记都只需要改 JSON。

## 发布

正文、浮窗解释、项目笔记（`notebook`）和小羊解说（`sheepGuide`）均来自 `content.json`。同一事实出现在多个位置时，请一起更新。运行 `python3 build.py` 会生成同样内容的静态备用页面；不要在 `script.js` 中另写一份项目文案。

`site.cv` 是默认英文简历链接，来源为简历仓库中可独立编译、默认无头像的 `english/base.tex`。编译后替换 `assets/Qishan-Shi-CV-English.pdf` 并更新链接的 `?v=` 标记。主 Download CV 按钮和顶部 CV 按钮都下载英文。

`site.cvChinese` 是中文简历链接，`site.cvChineseLabel` 是旁边的下载入口文字（默认“中文简历”）。中文 PDF 由简历仓库根目录的 `base.tex` 编译，替换 `assets/Qishan-Shi-CV.pdf` 并更新对应版本标记。两个入口均直接下载，不提供 Preview。网页采用各简历版本的信息并集、同口径数字的保守值；中文基础 PDF 保持其原文，不自动套用网页口径。

修改后用 GitHub 网页直接编辑也可以：打开仓库中的 `content.json`，点铅笔图标，保存到 `main` 分支。GitHub Pages 通常会在一分钟内更新。

如果页面没有变化，先确认 JSON 的引号、逗号与括号没有被删掉。JSON 有格式错误时，页面会保留原本的备用文案，不会白屏。


## 个人项目展示视频

编辑 `projects.creatorAssistant.demo`：`title` 是标题，`caption` 是时长与语言说明，`description` 是内容简介，`src` 是视频地址，`poster` 是封面地址，`repositoryUrl` 是项目 GitHub 链接。替换视频时将文件放入 `assets/`，再修改对应地址；删除整个 `demo` 字段可隐藏展示区。视频由访客手动播放，不自动下载整段视频。

当前使用项目仓库 README 中公开的 `sqsagent-promo.mp4`（约 42 秒，1080p，无音轨）。网页副本为 `assets/creator-assistant-demo.mp4`，封面取自该视频；画面保留虚构演示内容的说明。原项目仓库不作修改。


小羊当前采用较安静的节奏：首次散步等待 18 秒，后续每 28 秒尝试一次；保持清醒约 90 秒后才打瞌睡。首次自动长草在 45–65 秒后，后续间隔 75–120 秒。项目自动解说等待 3 秒，间隔至少 35 秒。上述等待受阅读、拖动和进食状态影响；主动点击、拖动、喂草不受这些被动等待限制。日常台词在 `Qsheep.messages`，项目解说在 `sheepGuide`。
