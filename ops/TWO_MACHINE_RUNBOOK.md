# AVENQIR + Altare 双机器运行手册（2026-11-23）

## 核心原则

- **AVE（SEUS/iFastNet）**：`https://avenqir.bg5.net/` 的正式 PHP + MySQL 网站。由 GitHub Actions 验证后通过 FTPS 发布；绝不把生产数据库、管理密码或私有数据上传到公开 GitHub 仓库。
- **AL（Altare Ubuntu Sandbox）**：在另一个网络出口做只读网站/链接/语言巡检。不能替代 AVE 的生产服务，也不能通过浏览网站获取管理员权限。
- **GitHub**：版本控制、校验、证据与自动发布；主机无法共享管理员会话或 Cookie。
- **Orbit Android**：另一个仓库 `initial2024/orbit-admin-android`。原签名配置在该仓库 `.github/workflows/android-stable-release.yml`，Keystore 的真实内容只能存在受保护 Secrets/实际持有者手中；不放公开仓库。

## AVE 已可自动执行的流程

1. 提交 `site/**` 或 `scripts/**` 至 `main`；
2. [deploy.yml](../.github/workflows/deploy.yml) 验证公开文件与回归测试；
3. 生产环境允许且 FTPS 凭证可用时自动部署至 `htdocs`，逐文件读取回校验 SHA-256；
4. 在 [Actions](https://github.com/initial2024/avenqir-site/actions/workflows/deploy.yml) 查明成功或失败；
5. 在 [部署页](https://avenqir.bg5.net/deploy-status.html) 查看浏览器看到的版本。若遭遇主机反机器人响应，必须以 FTPS 校验和实际浏览器结果分别判定。

紧急暂停：Repository Settings → Secrets and variables → Actions → Variables，`AVENQIR_DEPLOY_PAUSED=true`。

无须手工上传网页代码；这也**不保证**绕开 SEUS 免费主机的闲置回收政策。

## AL 首次安装：必须由机器所有者在 Altare Console 执行一次

打开 <https://console.altare.gg/> → 对应 Sandbox → Console，先审查源码：

<https://github.com/initial2024/avenqir-site/blob/main/ops/altare_bootstrap.sh>

然后执行：

```bash
curl --proto '=https' --tlsv1.2 -fsSL \
  https://raw.githubusercontent.com/initial2024/avenqir-site/main/ops/altare_bootstrap.sh \
  -o /tmp/avenqir-altare-bootstrap.sh
bash /tmp/avenqir-altare-bootstrap.sh
```

出现 `BOOTSTRAP COMPLETE`，且首轮实际巡检输出后，才能记录为 `AL_INSTALLED`。GitHub Actions 上的单元测试通过不等于服务器已安装。复查：

```bash
python3 /opt/avenqir/altare_cross_region_report.py --sample 20 --local-only
```

### 之后的定时执行

Altare Console → 对应 Sandbox → 可用的 Schedules/Jobs 功能中，创建每日 UTC 定时命令：

```sh
bash -lc 'python3 /opt/avenqir/altare_cross_region_report.py --sample 20'
```

这是 **Sandbox**，不支持 systemd；不要误把 Workstation 的开关机排程当作已经创建了 Sandbox 任务。仅在面板有对应 Schedule/Job 且真实执行记录可查看时，才标记 `AL_SCHEDULED`。检查 Sandbox 的 Settings → General → Pause when idle：启用自动暂停可能阻止长时间连续监测，不能假设定时任务一定唤醒已经暂停的实例。

### 自动回写 GitHub

GitHub Runner 的公开站点巡检已经自动汇总到 [Issue #21](https://github.com/initial2024/avenqir-site/issues/21)，不需要 Altare Token。要让 AL 的**独立网络出口**自动追加结果，仍需要在 Altare 单独存储受限的 GitHub fine-grained PAT：仅授权本仓库 `Issues: Read and write`，禁止加入代码、日志或聊天。具体安全安装方法见 [ALTARE_SETUP](ALTARE_SETUP.md)。不配置 PAT 时 AL 仍可本地运行巡检，但不能声称已回传。

## 两台机器的工作分配

| 工作 | AVE | AL | GitHub |
| --- | --- | --- | --- |
| 网站/PHP/管理员页面 | 生产运行 | 不接管 | 源码、FTPS 自动部署 |
| 多语言及网址目录 | 服务页面 | 只读抽样检测 | 全量静态 CI + 每周公开审计 |
| 外部网址可达性 | 提供目录 | 独立出口抽样（不跟重定向） | Issue #21 + 30 天 JSON Artifact |
| 修改失效网址 | 后台人工审核 | **禁止**自动删除 | 通过受审查 PR 修改源码 |
| Android 安装包签名 | 不涉及 | 不涉及 | Android 项目 Production 工作流（不可无批准自动签名） |
| 管理员凭据 / 私人邮箱 | 原服务自行持有 | **禁止**采集/转发 | **禁止**写入公开仓库 |

## 验收状态

- `AVE_SOURCE_READY`：源码/工作流存在；不等于部署成功。
- `AVE_DEPLOYED`：实际部署 Actions 成功且 FTPS 回读通过；浏览器显示另行验收。
- `AL_SOURCE_READY`：巡检与自动评论程序已写入仓库。
- `AL_INSTALLED`：只有机器内启动输出可证明。
- `AL_SCHEDULED`：必须看到 Altare 实际任务执行记录。
- `AL_GITHUB_REPORTING`：Issue #21 存在标有 Altare second-vantage 的新评论。
- `ANDROID_SIGNED_RELEASE`：Production 固定证书 SHA-256、真机回归、后端门禁与官方 Release URL 全部通过。

**不满足任一证据时，保持“未验证”，绝不能用其它机器或 GitHub 的通过记录替代。**
