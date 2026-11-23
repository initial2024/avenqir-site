#!/usr/bin/env python3
"""Update one GitHub Issue from a public-only AVENQIR audit report.

Uses only GitHub Actions' short-lived GITHUB_TOKEN with issues:write. No
administrator credentials, outbound webhooks, email messages or site writes.
"""
import argparse
import collections
import datetime
import html
import json
import os
import pathlib
import re
import sys
import urllib.error
import urllib.request

MARKER = "<!-- avenqir-readonly-audit-issue-v1 -->"
TITLE = "AVENQIR｜公开网址与多语言自动巡检（只读，最近结果）"
HISTORY_START = "<!-- audit-history-start -->"
HISTORY_END = "<!-- audit-history-end -->"


def result_summary(report):
    counts = collections.Counter(x.get("status", "UNKNOWN") for x in report.get("results", []))
    locale = report.get("locale", {})
    note = report.get("catalog_note", "")
    if counts["CANDIDATE_BROKEN"] or locale.get("status") == "FAIL":
        return "REVIEW", counts
    if (counts["UNKNOWN"] or counts["SKIP"] or counts["CHECK"] or
            locale.get("status") != "PASS" or note or not report.get("results")):
        return "INCOMPLETE", counts
    return "NO_CANDIDATE", counts


def safe_literal(value):
    # Prevent issue Markdown from interpreting external data as markup.
    value = str(value).replace("\\n", " ").replace("\\r", " ").replace("\\t", " ")
    return html.escape(value.replace("`", "’").replace("|", "¦")[:180], quote=True)


def previous_history(body):
    matched = re.search(
        re.escape(HISTORY_START) + r"\s*([\s\S]*?)\s*" + re.escape(HISTORY_END),
        body or "",
    )
    if not matched:
        return []
    return [x for x in matched.group(1).splitlines()
            if x.startswith("- ") and "](https://github.com/" in x][:8]


def make_markdown(report, run_url, older=None):
    state, counts = result_summary(report)
    moment = str(report.get("created_utc", "unknown UTC"))[:32]
    locales = report.get("locale", {})
    rows = report.get("results", [])
    fixed_count = report.get("fixed_endpoints", 0)
    history = [f"- {safe_literal(moment)}｜{state}｜[本次工作流]({run_url})"]
    history.extend(x for x in (older or []) if run_url not in x)
    history = history[:8]
    output = [
        MARKER,
        "# AVENQIR 公开站点只读巡检",
        "",
        f"**最近结果：{state}** · 执行时间：{safe_literal(moment)}",
        f"**完整证据：** [GitHub Actions 运行及 JSON Artifact]({run_url})",
        "",
        "> 本报告来自 GitHub Actions 外部网络环境，不能代表手机端加载速度；"
        "HTTP 200 也不代表安全认证。检测不涉及私人邮箱、管理员登录、"
        "Cookie、验证码或账户数据。",
        "",
        "## 本次摘要",
        f"- 公开固定页面：{fixed_count}；随机抽查第三方网址：{report.get('sampled_links', 0)}",
        f"- 站点多语言配置：{safe_literal(locales.get('status', 'UNKNOWN'))}；"
        f"界面语言 {locales.get('locales', '?')}，地区词条包 {locales.get('packs', '?')}",
        f"- 返回正常：{counts['OK']}；候选失效（404/410）：{counts['CANDIDATE_BROKEN']}；"
        f"待判断：{counts['UNKNOWN'] + counts['SKIP'] + counts['CHECK']}",
    ]
    if report.get("catalog_note"):
        output.append(f"- 目录源异常：{safe_literal(report['catalog_note'])}")
    if locales.get("missing"):
        output.append(f"- 缺少语言包：{safe_literal(', '.join(locales['missing'][:25]))}")
    if locales.get("invalid_packs"):
        output.append(f"- 词条包字段异常：{safe_literal(', '.join(locales['invalid_packs'][:25]))}")
    output += [
        "",
        "## 固定公开页面",
        "| 公开 URL | 检查结果 | HTTP | 耗时 |",
        "|---|---|---:|---:|",
    ]
    for row in rows[:fixed_count]:
        output.append(
            f"| {safe_literal(row.get('url', ''))} | {safe_literal(row.get('status', 'UNKNOWN'))} | "
            f"{row.get('code', 0)} | {row.get('ms', 0)} ms |"
        )
    suspects = rows[fixed_count:]
    issues = [x for x in suspects if x.get("status") != "OK"]
    output += ["", "## 本轮抽查需要复核的网址"]
    if issues:
        for row in issues[:40]:
            output.append(
                f"- `{safe_literal(row.get('url', ''))}`："
                f"{safe_literal(row.get('status', 'UNKNOWN'))} / HTTP {row.get('code', 0)}"
            )
    else:
        output.append("本轮没有发现需要人工复核的抽查网址；**不代表全部网址有效**。")
    output += [
        "",
        "**判定边界：** 404/410 只是失效候选，必须复核；403、429、重定向、"
        "超时或服务器拒绝 HEAD 均不能直接判定失效。"
        "**此巡检不会自动删除网址、变更分类或绕过第三方跳转确认。**",
        "",
        "## 最近 8 次巡检",
        HISTORY_START,
        *history,
        HISTORY_END,
        "",
        "此 Issue 自动更新同一条记录，避免每周新增一条 Issue；"
        "完整 JSON 报告在各自的 GitHub Actions Artifact 中保存，受 GitHub 保留期限制。",
        "",
    ]
    return "\n".join(output), state


def github_api(method, repo, token, route, payload=None):
    url = f"https://api.github.com/repos/{repo}{route}"
    data = json.dumps(payload, ensure_ascii=False).encode() if payload is not None else None
    request = urllib.request.Request(
        url, data=data, method=method,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": "Bearer " + token,
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "avenqir-public-audit-reporter/1",
            **({"Content-Type": "application/json"} if data is not None else {}),
        },
    )
    with urllib.request.urlopen(request, timeout=25) as response:
        return json.load(response)


def upsert_report(report, run_url, repo, token):
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repo):
        raise ValueError("Unexpected repository name")
    issues = github_api("GET", repo, token, "/issues?state=all&per_page=100")
    matches = [x for x in issues if not x.get("pull_request")
               and x.get("title") == TITLE and MARKER in (x.get("body") or "")]
    if len(matches) > 1:
        raise RuntimeError("More than one managed Issue found: refusing ambiguous updates")
    current = matches[0] if matches else None
    if current and current.get("state") != "open":
        # The user deliberately closed it. Do not silently reopen or recreate it.
        return None, "CLOSED_BY_OWNER", ""
    history = previous_history(current.get("body", "")) if current else []
    body, state = make_markdown(report, run_url, history)
    if current:
        issue = github_api("PATCH", repo, token,
                           f"/issues/{current['number']}", {"body": body})
        operation = "UPDATED"
    else:
        issue = github_api("POST", repo, token, "/issues",
                           {"title": TITLE, "body": body})
        operation = "CREATED"
    return issue.get("html_url"), operation, state


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report-dir", required=True)
    parser.add_argument("--run-url", required=True)
    args = parser.parse_args()
    folder = pathlib.Path(args.report_dir)
    files = sorted(folder.glob("public-audit-*.json"))
    if not files:
        raise SystemExit("No JSON audit report to publish")
    report = json.loads(files[-1].read_text(encoding="utf-8"))
    repository = os.environ["GITHUB_REPOSITORY"]
    token = os.environ["GITHUB_TOKEN"]
    result_url, operation, status = upsert_report(report, args.run_url, repository, token)
    summary = ("AVENQIR public audit: " + operation + ", status " + status +
               ", issue " + (result_url or "(closed by owner)") +
               ", source " + args.run_url)
    print(summary)
    step_summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if step_summary:
        with open(step_summary, "a", encoding="utf-8") as out:
            out.write("## AVENQIR public audit\n\n" + summary + "\n")


if __name__ == "__main__":
    main()
