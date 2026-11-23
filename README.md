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
