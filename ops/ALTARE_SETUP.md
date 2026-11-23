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

## Step 3. One-time scheduling

Altare **Sandbox has no systemd**; don't install or enable a systemd timer.
Use its **own Schedules/Jobs UI** (as available for your Sandbox) to run:

```sh
bash -lc 'python3 /opt/avenqir/altare_cross_region_report.py --sample 20'
```

Recommended cadence: **once per day**, preferably at a fixed UTC time.
The collector queries four AVENQIR public assets, the public Orbit homepage,
and at most 20 sampled HTTPS catalog links. It does not follow redirects,
delete links, modify categories, log in, or send requests to administrator
endpoints. Each HTTP operation is bounded by a timeout.

Scheduling does not revive a suspended sandbox unless Altare explicitly
documents or enables that behavior. Turn off the optional **Pause when idle**
setting if you expect continuous schedules, and confirm a first scheduled run
in the Altare dashboard.

When the audit status changes or one week has passed, the second-vantage
monitor posts an Issue comment; otherwise it prints `UNCHANGED_NO_SPAM`.
GitHub Actions continues independently every Monday and edits the main body
of the same Issue. The last 28 local JSON reports are retained under
`/opt/avenqir/reports`.

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
