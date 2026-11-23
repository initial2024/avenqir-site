# AVENQIR：公开源码 + GitHub Actions 自动发布

目标地址：`https://avenqir.bg5.net`。建议新建公开仓库：`initial2024/avenqir-site`。

## 当前状态

**已完成可公开的代码工程，但尚未创建远程仓库、配置任何密钥或连接 FTPS。** GitHub 连接可操作已有仓库，但当前会话没有“创建新仓库”的工具。第一次需要本人创建空仓库、添加文件与 Actions Secrets，之后可以通过 ChatGPT 更新已连接仓库来自动部署。

## 为什么可以用公开仓库

`site/` 只存放允许公开的网页、前端脚本和 PHP **程序代码**。不存放真实密码、管理员凭据、数据库配置、用户数据或会话。仓库可被任何人阅读或 Fork，但 FTP 密码保存在 GitHub Actions Secrets，**不应进入仓库的任何文件、提交记录或日志**。

公开仓库不等于自动安全：能向 `main` 推送代码、修改工作流、访问 Actions Secrets 的账户与协作者应严控；不要启用不可信 PR 的 `pull_request_target` 机密部署。

## 第一次安装（手机）

1. 在 <https://github.com/new> 创建 `initial2024/avenqir-site`，设置 **Public**，主分支 `main`。**建议勾选 Add a README file**，让仓库立即拥有 `main` 分支，方便已连接的 GitHub 工具后续写入文件；License 暂时不选。仓库还不存在时，不要尝试将本 ZIP URL 直接作为仓库内容。
2. 将这个工程根目录的 **`site/`、`scripts/`、`.github/workflows/deploy.yml`、`.gitignore`、`README-开始使用.md`** 上传到 GitHub 仓库对应目录。GitHub 手机网页对多文件夹上传有限制；如不方便，可以先建立空仓库，再在连接 ChatGPT 的 GitHub 中授权写入，以后让 ChatGPT 帮你创建和提交文件。
3. 在 **Settings → Secrets and variables → Actions → Secrets** 创建两个 Repository secrets：`AVENQIR_FTPS_USERNAME` 和 `AVENQIR_FTPS_PASSWORD`，分别填 **SEUS VistaPanel 的 FTP 用户名与 FTP 密码**。绝不要把密码发到聊天、Issue、README 或代码文件；如果密码同时用于主机面板，应把拥有部署权限的人视作拥有主机敏感权限。
4. 在 **Settings → Secrets and variables → Actions → Variables** 新建 `AVENQIR_AUTO_DEPLOY=false`。首次运行只执行代码检查，不自动上传；备份现有网站后，再改成 `true`。
5. 第一次部署建议在 **Actions → AVENQIR / verify and deploy via FTPS → Run workflow → do_deploy=true** 手动触发，检查同一 run 的完整日志和 `https://avenqir.bg5.net/deploy-state.json` 提交 SHA 是否一致。注意：手动部署也要求 `AVENQIR_AUTO_DEPLOY=true`。

## 后续升级

GitHub `main` 的 `site/**`、`scripts/**` 或工作流变化将运行代码校验。只有仓库变量为 `true`、所有检查通过时，才通过**强制加密 FTPS**向 `avenqir.bg5.net/htdocs` 上传。网址目录、管理员密码、MySQL 配置和留言内容不受影响（源文件中不包含这些文件）。

发布没有后台上传 API，也不会部署到 Cloudflare。它依赖 GitHub Actions 的额度、SEUS 的 FTPS 可用性及权限；没有人能保证免费主机永久保活。

## 重要安全/数据边界

- 不要提交或上传：`_private/`、`_store/`、`private-settings.php`、`feedback-config.php`、`.env`、FTP/MySQL 密码、初始化激活码、用户邮件、日志备份。
- 不要让未经审查的 Pull Request 自动合并到 `main`，也不要将 FTP 秘钥作为工作流输入。建议 GitHub 开启主分支保护、审查、限制协作者写入；公开仓库任何人都可以查看源码及旧提交。
- 更新程序**不会自动更新或备份 MySQL 数据结构**。修改表结构前须另外安排迁移/备份。
- 检查与部署的脚本使用 Python 标准库，不需要安装第三方 FTP Action。Checkout 固定为 GitHub 官方 action 的完整提交 SHA。
- FTPS 上传对现有文件采取**先上传临时副本，随后覆盖并下载比对**；若覆盖失败会尝试恢复旧文件。FTP 操作不是全站原子事务，恢复也可能失败，因此正式上线前必须备份线上程序和数据。
- 不会主动删除现有网站文件，不会删除 `_private` 或 `_store`；但被取消部署的旧代码文件不会自动从线上消失，需要人工审核清理。
- 部署失败必须检查日志，不能把“文件传上去”当作“网站已经成功运行”。`deploy-state.json` 是最后写入的版本标记；之后 HTTPS 核对一致才算通过。

## 发布状态与排错

- 版本检查：`https://avenqir.bg5.net/deploy-status.html`；原始 JSON：`/deploy-state.json`。
- `Missing/invalid GitHub Secret`：检查 secrets 名称及设置。
- `530`：FTP 用户名/密码或主机验证错误。
- TLS certificate error：停止，不要降级到普通 FTP。
- `550`：服务器目录/权限异常，检查域名专属 `htdocs`，不要擅自更改 FTP 根目录。
- `VERIFY_FAILED`：线上版本核验没有通过，可能是缓存、FTP 错误、服务器故障等，不能声称部署成功。
- `ROLLBACK_FAILED`：本次文件恢复不完整，需要用你保留的备份手动恢复。
