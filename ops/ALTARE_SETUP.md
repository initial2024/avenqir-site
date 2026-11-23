# Altare Sandbox → AVENQIR second-vantage reports

## Goal

This uses the existing **Altare Ubuntu 24.04 Sandbox** as a separate European
network vantage, without moving AVENQIR, Orbit Mail, credentials, or DNS.
The site and PHP administration stay at SEUS. A remote status check is not a
safety certificate and cannot guarantee any free hosting provider's activity
requirements.

It runs no inbound service, exposes no additional ports, installs no Docker,
and sends no email/password, device identifiers, tokens, or private mail to
AVENQIR.

## Step 1. One-time installation in the Altare Sandbox console

Open https://console.altare.gg/ , then select your existing Ubuntu Sandbox,
open its Console and **run this once**:

```bash
curl --proto '=https' --tlsv1.2 -fsSL \
  https://raw.githubusercontent.com/initial2024/avenqir-site/main/ops/altare_bootstrap.sh \
  -o /tmp/avenqir-altare-bootstrap.sh
bash /tmp/avenqir-altare-bootstrap.sh
```

### Short commands for narrow Android web terminals

Review the publicly deployed [short read-only installer](../site/al.txt) first.
After the [AVENQIR FTPS deployment](../.github/workflows/deploy.yml) has actually succeeded,
open the **Altare Sandbox console** and enter these **one at a time**, pressing Enter
after each line:

```bash
curl -fsSLo /tmp/al.sh https://avenqir.bg5.net/al.txt
head -n 1 /tmp/al.sh
bash /tmp/al.sh
```

The second command must show exactly `#!/usr/bin/env bash`. If it instead
shows HTML / an anti-bot page or the download errors, **do not execute it**.
Use the full pinned GitHub-source command above instead. The shortcut only
fetches and invokes the existing public `ops/altare_bootstrap.sh`; it has no
tokens, logins, email access, APK signing or production website writes.

`test -f /opt/avenqir/altare_cross_region_report.py` is merely a presence
check; it **does not install** the collector. Long lines wrapping visually in
a mobile terminal are not evidence that the command succeeded. Look for
`=== END ALTARE REPORT ===` and `=== BOOTSTRAP COMPLETE ===` printed
by the actual installer.

Inspect the bootstrap from GitHub before running remote shell scripts. The
bootstrap installs only two Python scripts under `/opt/avenqir` and prints a
**real, completed read-only test report**, ending with `BOOTSTRAP COMPLETE`.
If the downloaded script cannot be verified or Python fails, the bootstrap
stops without changing your running sites.

`python3 /opt/avenqir/altare_cross_region_report.py --sample 20 --local-only`
repeats a test without any GitHub access token.

## Step 2. Optional automatic report delivery

The existing GitHub Actions public audit already updates
[Issue #21](https://github.com/initial2024/avenqir-site/issues/21).
Altare can append a separate external-vantage comment **to that same Issue**.
This step requires a once-only fine-grained GitHub PAT stored in the sandbox.
If you don't accept the security implications, omit this step: local reports
still work, but automatic publishing from Altare does not.

At https://github.com/settings/personal-access-tokens/new create a
**fine-grained** token:

- Resource owner: `initial2024`
- Only select repository: `initial2024/avenqir-site`
- Repository permission: **Issues — Read and write**
- Everything else: no additional access
- Set a short expiration and rotate before expiration. This token is
  *not* an administrator session for the website, and cannot access private
  inboxes. It can, however, post or modify issues in this repository.

Inside the Sandbox console, enter it without shell history or echo:

```bash
install -d -m 700 /root/.config/avenqir
umask 077
read -r -s -p "GitHub Issues-only token: " AVENQIR_TOKEN
echo
printf '%s' "$AVENQIR_TOKEN" > /root/.config/avenqir/github_issue_token
unset AVENQIR_TOKEN
chmod 600 /root/.config/avenqir/github_issue_token
python3 /opt/avenqir/altare_cross_region_report.py --sample 10
```

Check that the result ends with `PUBLISH: https://github.com/...`.
**Never send the token, file, or terminal screenshot showing a token** into
ChatGPT or any Issue. If `PUBLISH: GITHUB_PUBLISH_FAILED_...` appears,
the report was saved locally but not posted.

## Step 3. One-time native Altare schedule (NOT done by bootstrap)

The Sandbox is a **template-based server**. Altare documents native
`Schedules` for template-based sandboxes, with a time-based trigger and a
`Send command` task; these are **not** the separate `Jobs` for
GitHub-deployed apps. See https://docs.altare.gg/api/schedules and
https://altare.gg/en/help/getting-started/schedules-automatic-restarts .

After a bootstrap update, run **one manual check** via the existing
sandbox Termius SSH session (this changes only local public-monitor state):

```bash
bash /opt/avenqir/altare_scheduled_check.sh
cat /opt/avenqir/state/latest-scheduled.status
```

Expect `AL_LAST_CHECK_RESULT=COMPLETE` and `AL_LAST_EXIT_CODE=0`.
This manual success proves installation and actual local execution,
**not** automatic scheduling.

Now open https://console.altare.gg/ → `utility-server` → `Schedules`.
Create one schedule, named `AVENQIR public audit AL`, enabled with:

| Time field (UTC) | Value |
| --- | --- |
| Minute | `10` |
| Hour | `3` |
| Day of month | `*` |
| Month | `*` |
| Day of week | `*` |

Under its task list add exactly one **Send command** task, with zero delay:

```sh
bash /opt/avenqir/altare_scheduled_check.sh
```

This script executes the original Python collector with `--local-only`,
uses an exclusive lock against concurrent runs, and writes one restricted
log and one atomic status file. It does **not** read a PAT even if one is
present, create VNC/Xvfb/Chrome processes, expose ports or restart
the sandbox.

After the first **scheduled** execution, check both:
- `Schedules` UI → task's actual run result and timestamp; and
- `cat /opt/avenqir/state/latest-scheduled.status`: the
  `AL_LAST_CHECK_ENDED_UTC` timestamp must be **later** than your last
  manual run. For details use
  `tail -n 25 /opt/avenqir/reports/latest-scheduled.log`.

The schedule's creation alone does not prove success. If you cannot find
`Schedules` for this exact utility-server, do not replace it with the
game-specific restart command or a Workstation timer. Share a screenshot
of the app's navigation and the run mode to confirm what is available.

**Pause when idle**: Settings → General can suspend the Sandbox after
inactivity; do not assume the schedule wakes it. If continuous daily
checks are essential, disable this optional pause and verify the
machine's own resource policy allows it. No systemd, extra machine,
remote SSH secret, GitHub PAT or publicly exposed proxy port is
required for local scheduled reports.

## GitHub-side audit schedule

Independently from AL, the repo's
[`.github/workflows/weekly-public-readonly-audit.yml`](../.github/workflows/weekly-public-readonly-audit.yml)
now runs **daily at 02:23 UTC**, updates the same
[Issue #21](https://github.com/initial2024/avenqir-site/issues/21)
and saves 30-day JSON artifacts. The workflow file retains its historical
filename to preserve links, but the **actual schedule is daily**.

Until an owner explicitly enables the optional Issues-only PAT reporting
described in Step 2, AL reports remain only on AL, and Issue #21 shows
**GitHub's independent vantage**, not AL's IP. Never label a GitHub runner
check as an AL machine check.

## Troubleshooting / rollback

- `PUBLISH: LOCAL_ONLY`: no token stored, or you chose `--local-only`.
- `PUBLISH: UNCHANGED_NO_SPAM`: successfully scheduled, but posting was
  suppressed because results have not meaningfully changed.
- `UNKNOWN` and redirects are not dead links; `CANDIDATE_BROKEN` is only a
  review candidate.
- If the GitHub token expires, create a new Issues-only token and replace only
  `/root/.config/avenqir/github_issue_token` in the sandbox.
- To stop, delete or disable the Altare schedule. To remove the scripts and
  reports, delete `/opt/avenqir`, and revoke the GitHub token.

**Security limitation:** storing any GitHub access token in a free shared-node
sandbox creates residual risk. Least-privilege + restricted expiry + file mode
0600 limit blast radius; none eliminate compromise risk. For zero token
exposure on Altare, keep reports local and rely on the GitHub Actions
scheduled audit for automatic Issue updates.
