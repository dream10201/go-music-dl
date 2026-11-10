# Go Music DL

> ⭐ 如果这个项目对你有帮助，欢迎点一个 Star。

<p align="center">
  <img src="./internal/web/templates/static/images/icon.png" alt="Music Downloader Icon" width="220" />
</p>

Go Music DL 是一个多平台音乐搜索与下载工具，支持 **Web** 和 **TUI**，覆盖单曲、歌单、专辑与排行榜。

## 🚀 快速开始

### Web / TUI

```bash
# Web，默认访问 http://localhost:8080/music
./music-dl web

# 挂载到反向代理二级目录
./music-dl web --base-path /dl

# 终端搜索
./music-dl -k "周杰伦"
```

Web 的搜索、下载和歌单浏览无需登录；修改设置或 Cookie 时才需要管理员账号。首次配置时，启动日志会打印 `Web setup token`，用它创建管理员账号即可。TUI 常用键：`↑/↓` 移动、`空格` 选择、`a` 全选、`r` 换源、`Enter` 下载、`w` 每日推荐、`q` 退出。

### Docker

```bash
docker compose up -d --pull always --remove-orphans
```

访问 `http://localhost:8080`。首次启动会自动创建 `./data`；Compose 不依赖仓库里的 Dockerfile 或其他文件，只需 `docker-compose.yml` 和镜像即可启动。修改源码后可使用 `docker compose -f docker-compose.dev.yml up -d --build` 本地构建。

### AI / Agent 调用

Web 服务提供 AI 能力索引。搜索、歌单、专辑、排行榜、歌单分类、换源、歌词和下载等能力全部复用现有的 `/music/*` 接口，不再维护第二套 AI 包装路由。

```bash
# 搜索歌曲，只请求 QQ 和网易云；不带 sources 时只搜咪咕
curl "http://localhost:8080/music/search?q=周杰伦&type=song&sources=qq&sources=netease"
```

API 索引：`http://localhost:8080/music/api/ai/index`，精简说明：`http://localhost:8080/music/llms.txt`。索引会列出可直接复用的现有搜索、详情、排行榜、歌单分类、换源和下载接口。

---

![Web UI 1](./screenshots/web1.png)
![Web UI 2](./screenshots/web2.png)

![TUI 1](./screenshots/tui1.png)
![TUI 2](./screenshots/tui2.png)

## 主要功能

* **多端使用**：Web 和 TUI 终端。
* **搜索与下载**：多平台聚合搜索单曲、歌单和专辑，支持批量下载、换源和无损音频。
* **歌单浏览**：浏览官方歌单分类和排行榜。
* **登录能力**：支持 Cookie 与扫码登录，用于更高音质和部分受限资源。
* **默认音源**：Web 与 TUI 默认只使用咪咕；其他音源需在“搜索源设置”中手动勾选。

## 歌单 / 专辑支持

Web 与 TUI 都支持单曲、歌单、专辑三种搜索类型；粘贴歌单或专辑链接会自动识别来源并进入详情。曲目列表支持下载和批量操作。

渠道覆盖网易云、QQ、酷狗、酷我、咪咕、汽水、Apple Music、Spotify、Bilibili、Jamendo、JOOX 和千千等，实际可用来源以界面列表为准。

Spotify 不再强制要求 Cookie 或开发者凭据：歌曲、专辑、歌单搜索以及公开链接、分类、榜单和歌词均可直接使用。配置 Client ID/Secret 后会自动优先官方 API；匿名 Web Player 不可用时会明确提示，不会伪装成“没有搜到”。Spotify 请求支持 `HTTP_PROXY`、`HTTPS_PROXY` 和 `NO_PROXY`；Windows 下未设置这些环境变量时会自动读取当前用户的静态系统代理设置。

## 歌单分类

支持网易云、QQ、酷狗、酷我、咪咕、千千、JOOX、汽水、Apple Music 和 Spotify；汽水提供每日推荐、流行、华语、欧美、国风等分类。默认只加载咪咕，勾选其他音源后再点“歌单分类”即可切换。分类歌单可查看详情、下载和批量操作。

## 排行榜

首页“排行榜”支持网易云、QQ、酷狗、酷我、咪咕、汽水、Apple Music 和 Spotify 的官方榜单，默认只加载咪咕。各平台的“热门单曲”对应当地热歌榜，榜单歌曲可直接下载和批量处理。

QQ 下载需要有效 Cookie；汽水支持 Cookie + 签名获取会员整曲，签名不可用时自动回退到公开试听片段。

## Cookie 与扫码登录

设置页可管理各平台 Cookie，并提供手动抓取步骤和请求域名。网易云、QQ、酷狗和 Bilibili 支持扫码登录，成功后自动保存 Cookie。

汽水音乐扫码暂不可用，需要手动配置 Cookie；会员整曲优先使用 music-lib 内置的本机签名器，也可配置可信的远程签名服务。Cookie 仅保存在本地数据目录，请勿公开分享配置文件。

## 文件命名

下载默认保存到 `data/downloads`。设置页支持 `{name}`、`{artist}`、`{album}`、`{source}`、`{id}`、`{ext}` 等文件名模板。

## 下载与同步

下载默认走流式模式，支持 `Range` 断点。设置页可按需开启：

* 下载时内嵌封面和歌词，依赖 `ffmpeg`；缺失时自动跳过，不影响原始音频下载。
* 可选择在音频文件同目录生成同名标准 LRC，不改动已有歌词文件；也可单独点击歌词按钮保存。
* 下载时同步到 WebDAV，可填写地址、账号、密码和远端目录。

FFmpeg 用于元数据写入。Docker 镜像已内置；CLI 如需这些能力，请自行安装。可用 `ffmpeg -version` 检查。

## 新增改动（简要）

* **排行榜与歌单**：聚合各平台榜单和热门单曲，补齐分类歌单、链接解析及批量操作。
* **搜索过滤**：支持屏蔽 Live / Remix / Demo 等版本和 60 秒以下试听，并统一简繁体及零宽字符。
* **登录与汽水**：支持 Cookie、扫码登录和汽水会员整曲签名，均不可用时自动回退公开试听。
* **下载与同步**：支持封面 / 歌词下载、内嵌元数据、WebDAV 和自动换源。
* **AI 通道**：新增 AI 能力索引，复用现有搜索、换源和下载接口。

## CLI/TUI 常用命令

```bash
# 搜索
./music-dl -k "周杰伦"
```

TUI 常用按键：

* `↑/↓` 移动
* `空格` 选择
* `a` 全选/清空
* `r` 对勾选项换源
* `Enter` 下载
* `b` 返回
* `w` 每日推荐歌单
* `q` 退出

更多用法：

```bash
# 查看帮助
./music-dl -h

# 指定搜索源
./music-dl -k "周杰伦 晴天" -s qq,netease

# 指定下载目录
./music-dl -k "周杰伦" -o ./my_music

# 下载时包含封面和歌词
./music-dl -k "周杰伦" --cover --lyrics
```

## GitHub Actions 自动构建

本项目已配置 GitHub Actions 工作流。推送到 `main` 分支时，会自动触发 `.github/workflows/docker.yml`，构建 amd64 镜像并推送到 GHCR（`latest` 标签）。

## Web 换源说明

单曲卡片里的“换源”会在其它平台里找更像的版本：

* 先看歌名/歌手相似度
* 再看时长差异（太大就跳过）
* 最后做可用性探测

当前会跳过 soda 与 fivesing。

## 每日歌单推荐

TUI 在输入界面按 `w` 直接拉取推荐歌单，然后回车进详情。

## 支持平台

| 平台        | 包名         | 搜索 | 下载 | 歌词 | 歌曲解析 | 歌单搜索 | 歌单推荐 | 歌单分类 | 我的歌单 | 扫码登录    | 歌单歌曲 | 歌单链接解析 | 专辑搜索 | 专辑歌曲 | 专辑链接解析 | 备注                                                                                                                                                              |
| ----------- | ------------ | ---- | ---- | ---- | -------- | -------- | -------- | -------- | -------- | ----------- | -------- | ------------ | -------- | -------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 网易云音乐  | `netease`  | ✅   | ✅   | ✅   | ✅       | ✅       | ✅       | ✅       | ✅       | ✅          | ✅       | ✅           | ✅       | ✅       | ✅           | 支持 FLAC 无损                                                                                                                                                    |
| QQ 音乐     | `qq`       | ✅   | ✅   | ✅   | ✅       | ✅       | ✅       | ✅       | ✅       | ✅          | ✅       | ✅           | ✅       | ✅       | ✅           | 支持 FLAC 无损                                                                                                                                                    |
| 酷狗音乐    | `kugou`    | ✅   | ✅   | ✅   | ✅       | ✅       | ✅       | ✅       | ✅       | ✅          | ✅       | ✅           | ✅       | ✅       | ✅           | 支持普通歌曲 FLAC 无损                                                                                                                                            |
| 酷我音乐    | `kuwo`     | ✅   | ✅   | ✅   | ✅       | ✅       | ✅       | ✅       | ❌       | ❌          | ✅       | ✅           | ✅       | ✅       | ✅           |                                                                                                                                                                   |
| 咪咕音乐    | `migu`     | ✅   | ✅   | ✅   | ✅       | ✅       | ❌       | ✅       | ❌       | ❌          | ✅       | ✅           | ✅       | ✅       | ✅           | 歌单歌曲使用 MIGUM3 接口                                                                                                                                          |
| 千千音乐    | `qianqian` | ✅   | ✅   | ✅   | ✅       | ⚠️     | ❌       | ✅       | ❌       | ❌          | ✅       | ✅           | ✅       | ✅       | ✅           | 歌单搜索可能返回空，已知 ID/链接可解析                                                                                                                            |
| 汽水音乐    | `soda`     | ✅   | ✅   | ✅   | ✅       | ✅       | ❌       | ✅       | ✅       | ⚠️ 未调通 | ✅       | ✅           | ✅       | ✅       | ✅           | 音频解密，Cookie + 内置本机签名器可下会员整曲（装过官方客户端即用，也可配远程签名服务，都没有时为试听片段），支持短链、个人歌单和发现页歌单分类；扫码登录暂未调通 |
| 5sing       | `fivesing` | ✅   | ✅   | ✅   | ✅       | ✅       | ❌       | ❌       | ❌       | ❌          | ✅       | ✅           | ❌       | ❌       | ❌           |                                                                                                                                                                   |
| Jamendo     | `jamendo`  | ✅   | ✅   | ✅   | ✅       | ⚠️     | ❌       | ❌       | ❌       | ❌          | ✅       | ✅           | ✅       | ✅       | ✅           | 歌单搜索可能返回空，公开歌单链接可解析                                                                                                                            |
| JOOX        | `joox`     | ✅   | ✅   | ✅   | ✅       | ✅       | ❌       | ✅       | ❌       | ❌          | ✅       | ✅           | ✅       | ✅       | ✅           | 歌单支持 OpenJOOX 接口和网页数据兜底                                                                                                                              |
| Bilibili    | `bilibili` | ✅   | ✅   | ✅   | ✅       | ✅       | ❌       | ❌       | ❌       | ✅          | ✅       | ✅           | ❌       | ❌       | ❌           | 支持 FLAC 无损                                                                                                                                                    |
| Apple Music | `apple`    | ✅   | ⚠️ | ✅   | ✅       | ✅       | ❌       | ✅       | ❌       | ❌          | ✅       | ✅           | ✅       | ✅       | ✅           | 下载仅 preview，完整需 gamdl 解密                                                                                                                                 |
| Spotify     | `spotify`  | ✅   | ⚠️ | ✅   | ✅       | ✅       | ✅       | ✅       | ✅       | ❌          | ✅       | ✅           | ✅       | ✅       | ✅           | 官方 API 仅提供 30 秒 preview；歌曲 / 专辑 / 歌单搜索、公开链接解析、分类、榜单和歌词均无需凭据，搜索走匿名 Web Player，配置凭据后优先官方 API；个人歌单仍需 OAuth |

> `⚠️` 表示方法已接入，但平台搜索接口结果不稳定；优先使用已知 ID 或链接解析。

## 歌曲链接解析

支持直接解析音乐分享链接：

```bash
./music-dl -k "[https://music.163.com/#/song?id=123456](https://music.163.com/#/song?id=123456)"
```

支持解析的平台：网易云、QQ音乐、酷狗、酷我、咪咕、Bilibili、汽水音乐、5sing、Jamendo、JOOX、千千音乐、Apple Music、Spotify。

## 歌单链接解析

支持直接解析歌单/合集分享链接：

```bash
./music-dl -k "[https://music.163.com/#/playlist?id=123456](https://music.163.com/#/playlist?id=123456)"
```

支持解析的平台：网易云、QQ音乐、酷狗、酷我、咪咕、Jamendo、JOOX、千千音乐、汽水音乐、5sing、Bilibili、Apple Music、Spotify。

## 专辑链接解析

支持直接解析专辑分享链接：

```bash
./music-dl -k "[https://music.163.com/#/album?id=123456](https://music.163.com/#/album?id=123456)"
```

支持解析的平台：网易云、QQ音乐、酷狗、酷我、咪咕、Jamendo、JOOX、千千音乐、汽水音乐、Apple Music、Spotify。

## 常见问题

### 通用问题

**Q: 有些歌搜不到或下载失败？**
可能是付费限制、平台接口变更或网络问题。

**Q: Web 模式打不开？**
检查端口是否占用，或浏览器插件是否拦截。

**Q: 如何设置 Cookie 获取更高音质？**
Web 右上角“设置”里可添加平台 Cookie。网易云音乐、QQ 音乐、酷狗音乐、Bilibili 支持点击输入框右侧的“扫码”按钮登录，扫码成功后会自动保存 Cookie。汽水音乐新版扫码登录暂未调通，入口已临时隐藏，请先手动配置 Cookie；汽水音乐会员曲目想要下载整曲，默认用内置的“本机签名器”（装过汽水官方客户端即自动可用，无需额外服务）。客户端不在默认位置时，可在“汽水音乐安装目录”中填写包含 `SodaMusic.exe` 和 `bdms.node` 的版本目录；也可以设置 `QISHUI_CLIENT_DIR`，环境变量优先。“汽水音乐整曲取流”里的签名服务地址留空即可；如果要在别的机器上跑签名服务，再填上那边的地址与 Token。

**Q: 如何查看歌单分类？**
Web 首页提供“歌单分类”入口，可直接浏览所选音源的官方分类，其中汽水音乐提供发现页的 13 个推荐分类（每个分类会聚合多轮随机推荐并去重）。

**Q: 开启“内嵌元数据”后没生效？**
先确认系统已安装 FFmpeg 且 `ffmpeg -version` 可执行；若不可用，程序会降级为原始音频下载（不内嵌封面/歌词）。

## 项目结构

```text
go-music-dl/
├── cmd/
│   └── music-dl/          # CLI/TUI 主程序
├── core/                  # 核心业务逻辑
├── internal/
│   ├── cli/               # TUI 界面 (如: ui.go)
│   └── web/               # 重构后的 Web 后端服务
│       ├── templates/     # 前端模板与静态资源分离
│       ├── server.go      # Web 服务主入口
│       └── music.go       # 音乐搜索与解析路由
├── data/                  # 数据目录，Docker 首次启动时自动创建
│   ├── downloads/         # 下载的音乐文件
│   ├── cookies.json       # Cookie 配置文件
│   └── settings.db        # 统一 SQLite 数据库（设置 / Cookie / 下载记录）
├── .github/workflows/     # GitHub Actions 工作流
├── screenshots/           # 截图资源
├── docker-compose.yml     # Docker 生产环境配置 (直接拉取镜像)
├── docker-compose.dev.yml # Docker 开发环境配置 (本地构建)
├── Dockerfile             # Docker 构建配置
├── go.mod                 # Go 模块配置
├── README.md              # 主项目说明
├── run.bat                # Go Music DL - 启动脚本 (Windows)
└── run.sh                 # Go Music DL - 启动脚本 (Linux/macOS)
```

## 技术栈

* **核心库**: [lib/](lib/) - 音乐平台搜索下载
* **CLI 框架**: [Cobra](https://github.com/spf13/cobra) - 命令行工具
* **Web 框架**: [Gin](https://github.com/gin-gonic/gin) - Web 框架
* **TUI 框架**: [Bubble Tea](https://github.com/charmbracelet/bubbletea) - 终端界面

## 贡献

欢迎提交 Issue 或 Pull Request。

## 许可证

本项目遵循 GNU Affero General Public License v3.0（AGPL-3.0）。详情见 [LICENSE](LICENSE)。

## 致敬

感谢以下优秀的开源项目：

* **下载库**: [0xHJK/music-dl](https://github.com/0xHJK/music-dl) - 音乐下载库
* **下载库**: [CharlesPikachu/musicdl](https://github.com/CharlesPikachu/musicdl) - 音乐下载库
* **接口设计参考**: [metowolf/Meting](https://github.com/metowolf/Meting) - 多平台音乐聚合与接口封装
* **无损音乐**: [Suxiaoqinx/Netease_url](https://github.com/Suxiaoqinx/Netease_url) - 网易云音乐 FLAC 无损音乐解析
* **QQ 音乐**: [Suxiaoqinx/qqmusic_flac](https://github.com/Suxiaoqinx/qqmusic_flac) - QQ 音乐 FLAC 解析
* **汽水音乐接口参考**: [Zencok/baka-plugins](https://github.com/Zencok/baka-plugins) - 汽水音乐搜索、取流和扫码接口参考
* **汽水音乐整曲方案**: [sodahub-org/sodam](https://github.com/sodahub-org/sodam) - Cookie + 设备指纹 + 签名（调官方客户端 bdms.node）取整曲的完整实现，本项目汽水会员整曲能力的直接源头

## 免责声明

仅供学习和技术交流使用。下载的音乐资源请在 24 小时内删除。

## Star History

[![Star History Chart](https://star-history.dera.page/svg?repos=guohuiyuan/go-music-dl&type=date&legend=top-left)](https://star-history.dera.page/#guohuiyuan/go-music-dl&type=date&legend=top-left)
