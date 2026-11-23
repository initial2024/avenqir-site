# AVENQIR — Personal Hub

**网站：** https://avenqir.bg5.net/  
**状态：** 已启用基于 GitHub Actions 的主分支自动 FTPS 部署（首次成功发布：2026-11-23）。

本仓库公开保存 AVENQIR 的网站程序。功能包括 由目录运行时去重计算的精选网址入口、任务发现路径、私人本地收藏备份、网络检测、DNS / GitHub 工具、解压小游戏、笔记、留言反馈与手机端界面。

## 如何更新网站

1. 修改或提交仓库中的 `site/` 网页 / PHP / JS / CSS / 图片，或 `scripts/` 构建部署代码。
2. 将改动提交到 `main`，GitHub Actions 的 `AVENQIR / verify and deploy via FTPS` 自动运行。
3. 校验通过后使用 **Explicit FTPS + TLS 证书验证**将白名单程序文件同步到 `avenqir.bg5.net/htdocs`。
4. 上传器在每个文件写入后从 FTP 下载并进行 SHA-256 回读校验；不匹配即报错，并对当前覆盖文件尝试恢复旧内容。
5. 最后写入 `deploy-state.json` 记录提交 SHA。可打开 https://avenqir.bg5.net/deploy-status.html 查看浏览器端版本信息。

查看运行情况：[GitHub Actions](https://github.com/initial2024/avenqir-site/actions/workflows/deploy.yml)。

### 暂停自动部署（紧急停止开关）

Settings → Secrets and variables → Actions → **Variables**，新增或修改：

- `AVENQIR_DEPLOY_PAUSED` = `true`：跳过正式部署，但仍可验证代码。
- `AVENQIR_DEPLOY_PAUSED` = `false`（或未设置）：允许经过校验的 `main` 提交自动部署。

旧版安装说明中的 `AVENQIR_AUTO_DEPLOY` 和 `AVENQIR_INITIAL_DEPLOY_APPROVED` 已不是当前工作流的发布条件，避免误以为它们还能暂停部署。

### 两种不同的验收结果

- **FTPS 上传成功：** TLS 连接、目标目录、逐文件读回与 SHA-256 校验全部通过，表示服务器文件确实已同步。
- **公网 HTTP 检测：** SEUS / iFastNet 有时对 CI 请求返回 `aes.js` 反机器人验证页，导致无法读取 `deploy-state.json`。此时标记为 **HTTP_PROBE_INCONCLUSIVE**，不能宣称已验证最终浏览器画面；应再用手机浏览器检查。

首次发布记录：[GitHub Actions #45109456969](https://github.com/initial2024/avenqir-site/actions/runs/45109456969)（FTPS 成功，HTTP 自动探测不确定）。

## 代码与数据边界

- `site/`：允许公开的源文件，包含 HTML、CSS、JS、PHP、网站素材。
- `scripts/`：源文件审计、FTPS 部署、线上版本校验。
- `tests/`：部署代码的回归测试。
- `.github/workflows/deploy.yml`：自动发布工作流。
- `.github/workflows/ftps-connection-test.yml`：只读 FTP 登录检查。

**绝对不要提交**：`_private/`、`_store/`、`private-settings.php`、`feedback-config.php`、`.env`、数据库备份、FTP / VistaPanel / MySQL 密码、管理员激活码、私人留言等用户数据。

GitHub Secrets 仅保存 `AVENQIR_FTPS_USERNAME` 和 `AVENQIR_FTPS_PASSWORD`；不要将它们写进普通文件或 Actions 日志。部署脚本不会删除未纳入版本控制的线上数据。

**部署不是整站原子事务。** 如后续某个文件上传失败，可能已有其他文件更新；GitHub 的 `Revert` 可以让网站程序回退，但不能恢复 MySQL / 私人目录数据。重要版本更新前应独立备份。

## 公开仓库安全提示

只有可信维护者可以获得仓库写入权限。修改 `.github/workflows/` 或 `scripts/` 的人可能间接影响 Actions Secrets 的使用方式。建议在 GitHub Settings → Branches / Rulesets 限制 `main` 直接改动并要求验证。**请勿接受未经审查的代码或工作流变更。**

第三方网站链接仅供导航；不保证其安全性或准确性。详见 `site/disclaimer.html` 和 `site/privacy.html`。

_本项目没有启用小模型、VPN、网页代理或自建邮件服务器。_

## AVENQIR v8.5：动态目录

网址数量以当前浏览器加载的公开后台条目和内置目录合并去重为准，首页与目录页读取相同资源，不把某次代码提交的计数写死。手机端可逐页查看更多或一次显示全部。搜索未命中时，只有用户提交搜索后才询问是否前往第三方引擎，以及是否主动反馈推荐收录。反馈联系信息必须由用户勾选后才保存在本机浏览器，正文不会被本地记忆。

## AVENQIR v8.7：深度分类目录

2026-11-23 的目录快照包含 **559 个去重 HTTPS 入口、44 个资源分类、8 个主题分组**。相对 v8.6 新增 310 条；最小类别不少于 8 条。新增来源由 `site/atlas-depth-a.js` 至 `site/atlas-depth-d.js` 管理；`site/atlas-taxonomy.js` 定义互不重叠的分类分组。首页与目录实际展示数字始终从运行时去重后的内容生成，不能把该快照硬编码到 UI。分类按主题分组，支持分类名查找和展开全部，未知后台类别不会被删除或隐形过滤。用户启用的个性化功能仍仅在本地汇总分类偏好；新增目录不会触发后台使用记录上传。

**限度：** 目录的链接去重、HTTPS 语法和本地 URL 安全门禁通过测试，不表示对全部 559 个网站逐一完成实时可达性、安全性或服务条款认证；未经特批的第三方地址仍触发访问确认。

## AVENQIR v8.8：可选本地地区推荐与 AI 官方资源

内置目录开发快照包含 **1028 个独立 HTTPS 网址、50 个分类、40 个国家或地区、8 个主题分组**。v8.7 的 559 条之上新增 **469 条**：62 条 AI 平台与专业工具、95 条第一批地区公共资源、60 条第一批当地常用服务，再加 140 条扩展地区公共资源及 112 条扩展当地常用服务（相加 62+95+60+140+112=469）。

分类包含 AI 官网、AI 绘图、AI 视频、AI 编程、AI 语音、AI 研究。按国家或地区选择涵盖 40 个区域，每个至少有 9 条本地公开资源、4 条生活服务；自动推荐优先显示日常交通、邮政、地图、零售等实用资源，同时穿插公共机构资料，供参考，不代表实际使用率排行榜。

**隐私与准确性边界：** 这不是 IP 定位。原生浏览器 JS 不能可靠本地确认公网出口 IP 国家。只有用户主动开启后才依据 `Intl.DateTimeFormat().resolvedOptions().timeZone` 给出**可手动覆盖**的国家或地区建议；时区不唯一表示位置。无法识别即隐藏地区推荐。没有 IP 请求、GPS 权限、第三方地理服务调用或服务器同步；本机仅存启用状态、自动/手动模式、手选地区代码，关闭即移除；原有个人化兴趣与收藏独立保留。服务商仍可能记录正常网页请求 IP，不承诺零日志。

目录的 HTTPS 校验、去重及本地风险门禁不等于网站在线性或安全性实时认证；新增第三方网址默认仍走外部跳转提示。部分服务有地区限制、付费墙、登录或反机器人策略，不应自动跳过。

## AVENQIR v8.9｜网址结构安全审计和来源记录

新版本的安全审计分为四种**不同含义**的状态：静态结构检查通过、精确官网来源地址已核对、含风险特征需额外确认、因结构不合规而被拦截。来源已核对**不代表**第三方网址已经取得官方安全证书、完成恶意程序或钓鱼扫描，也不证明该站将一直安全。新增 IPv4 共享地址/保留地址和 IPv6 非公网地址的硬拦截、短链接与 IDN 等额外提示；不降低本机原有外链确认策略。

`scripts/audit_directory_links.py` 强制审计全部公开收录网址，在 PR 和正式部署时校验独立 URL、内网访问、协议、凭据、类别与地区覆盖情况；静态违规阻断发布。`tests/test_atlas_safety.cjs` 验证 URL 风险规则和来源状态。已审查的来源通过**精确 HTTPS URL** 清单匹配，含参数或类似域名不继承权限。本机用户选择 30 天跳过确认，不改变来源核对结果。

公开目录提供自愿点击的 Google Safe Browsing 外部风险查询链接，点击后才会向 Google 提交该条公开网址，含查询参数或锚点的地址不自动构造外部查询链接。Google 的结果属于威胁情报信号，未报告风险不等于安全认证。静态审计本身不联网，也不上传访客记录、搜索词或任何私人书签。
