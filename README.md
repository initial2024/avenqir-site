# AVENQIR — Personal Hub

官网：**https://avenqir.bg5.net/**

这是 AVENQIR 网站的公开源码仓库。项目包含网址目录、网络检测、工具箱、小游戏、笔记及留言反馈等模块。

## 项目结构

- `site/`：可公开发布的 HTML / CSS / JavaScript / PHP 程序及图像资源。
- `scripts/`：公开文件审计、网站完整性检查、加密 FTPS 部署和线上版本校验。
- `tests/`：部署器回归测试。
- `.github/workflows/deploy.yml`：验证与受控发布。
- `.github/workflows/ftps-connection-test.yml`：只读 FTPS 连通性检查。

## 安全和数据边界

**不会将运行时机密或用户数据放在公开仓库**。不要提交：

`_private/`、`_store/`、`private-settings.php`、`feedback-config.php`、`.env`、FTP/VistaPanel/MySQL 密码、留言记录、用户邮箱、初始化激活码。

GitHub Secrets 名称为 `AVENQIR_FTPS_USERNAME`、`AVENQIR_FTPS_PASSWORD`，值只由仓库所有者在 Settings → Secrets and variables → Actions 中配置。

网站公开源码与服务器正在运行的数据是两回事。代码部署不会自动备份或迁移 MySQL，不应该删除或覆盖服务器上的私有目录。

## 自动部署状态

源码已经导入仓库；**生产部署尚未启用**。必须同时满足：

1. `AVENQIR_AUTO_DEPLOY=true`
2. `AVENQIR_INITIAL_DEPLOY_APPROVED=true`

两者均为 GitHub Actions 的 **Repository variables**，不是 Secrets。若任何一项缺失或为 false，正式部署任务必须跳过。

首次启用之前，应确保 **FTPS 连接测试持续通过**、核对服务器目标 `avenqir.bg5.net/htdocs`、确认程序文件覆盖范围，然后在 Actions 中手动运行一次带 `do_deploy=true` 的发布。首次验收成功之后，可以使用自动部署。

**注意**：此前同一账号曾出现 FTPS 测试成功、随后重新登录返回 `530` 的不一致情况，尚未证明上传可靠。不能因此跳过发布前连接验收。

## 使用和维护

网站页面直接在 `site/` 修改；往 `main` 提交相关修改即可触发自动验证。发布时采用加密 FTPS；部署器只处理通过验证的可公开程序文件，不处理私密配置。

公开网站提供第三方链接与网络检测结果，不构成安全担保；相关免责声明与隐私说明见 `site/disclaimer.html`、`site/privacy.html`。

_本项目不需要任何模型推理服务。_
