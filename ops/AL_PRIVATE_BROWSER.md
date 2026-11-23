# AL Sandbox private remote browser (no Workstations beta)

**Status: SOURCE IMPLEMENTED, NOT DEPLOYED TO USER SANDBOX.** The Altare
Sandbox itself is a separate computer. GitHub CI cannot install software into
that machine without an authorized Altare console or API connection.

## What it does

On the *existing* Ubuntu/Debian amd64 Altare Sandbox:
- Runs official Google Chrome as a dedicated unprivileged Linux user `albrowser`.
- Uses an isolated Xvfb display automatically selected from `:89` to `:99`, reusing only its own `albrowser` Xvfb process. It does **not** take or clear a different project's `:88` display; runs openbox without Docker/systemd.
- Serves VNC on **127.0.0.1:5901 only**, guarded by a VNC password.
- Optional Cloudflare Tunnel + **private Cloudflare Access allow policy**
  renders the VNC session in your phone's browser on a separate HTTPS hostname.
- Site requests are made by the Chrome process **on the existing Sandbox
  network exit**, not by a new Workstation and not by AVENQIR's PHP host.
- AVENQIR remains a bookmark/launcher, not an unprotected reverse proxy or
  an iframe that captures Altare cookies.

**Important:** This is a personal remote desktop, not a proxy/VPN service.
Altare terms forbid public proxies/VPNs, abuse/bypass tools and automatic
free-credit farming. Use only for your own authorized browsing and comply
with the target site's terms. If Altare considers your traffic non-compliant,
stop immediately. Do not attempt to defeat bans, verification or rate limits.
See https://altare.gg/en/terms .

## Existing Xvfb display :88 belongs to another running process

The owner's Altare console showed `/tmp/.X88-lock` PID **7375** and
`ps -ef` confirmed a running `Xvfb :88` process. The earlier
`AL_BROWSER_DENY: Virtual display failed` was therefore a **real
display conflict**, not proof of a stale lock. Its ownership by a
particular earlier project is **not confirmed**.

Never run `rm /tmp/.X88-lock`, delete `/tmp/.X11-unix/X88`, or kill
PID 7375 without separately establishing ownership. **No reboot,
reinstall, process termination, or VNC-password regeneration is needed.**

The script now picks the first free screen between `:89` and `:99`
(after attempting to reuse its own running screen). It checks the
candidate lock and Unix socket without deleting them. It passes that
same display to Xvfb, Openbox, Chrome and localhost-only x11vnc. If
none is available, it fails rather than trespassing on another service.

After downloading the updated script with normal HTTPS certificate
verification, run:
```bash
bash -n /opt/avenqir/al_private_browser.sh
bash /opt/avenqir/al_private_browser.sh start
bash /opt/avenqir/al_private_browser.sh status
```

Successful launch reports `AL_SELECTED_DISPLAY=:89` (or another free
candidate), `AL_PRIVATE_VNC_LOCAL_ONLY=YES`, and status shows
`AL_XVFB_DISPLAY=:89` plus running Chrome/VNC. This feature still
needs real AL machine acceptance. Do not expose port 5901 publicly
or use Chrome `--no-sandbox`.

## AL Console: curl (77) / missing root CA certificates

A **real device screenshot** showed:
`curl: (77) error setting certificate file: /etc/ssl/certs/ca-certificates.crt`
followed by `bash: /tmp/als: No such file or directory`.
The download did not happen; neither error proves the private browser is
installed or running. Never run a non-existent script or use `curl -k`
to suppress TLS certificate verification.

On the same AL Sandbox console, as `root`, run commands individually:

```bash
unset CURL_CA_BUNDLE SSL_CERT_FILE REQUESTS_CA_BUNDLE
export DEBIAN_FRONTEND=noninteractive
dpkg --configure -a
apt-get update
apt-get install -y --reinstall ca-certificates
update-ca-certificates
ls -lh /etc/ssl/certs/ca-certificates.crt
curl -fsSI https://raw.githubusercontent.com
```

Stop if `apt-get` or `update-ca-certificates` fails. The noninteractive
environment prevents a pending `tzdata` or `Geographic area:` prompt from
consuming subsequently pasted shell commands. Do not use `--insecure`,
`Acquire::https::Verify-Peer false`, a third-party CA bundle or copied
private key. If the CA file exists and curl still returns (77), check
`env | grep -E 'CURL_CA_BUNDLE|SSL_CERT_FILE|REQUESTS_CA_BUNDLE'` and
`ls -l /etc/ssl/certs/ca-certificates.crt` for an invalid override or
broken symlink; do not blindly install browsers in that state.

Only after TLS verification passes, download the installer and verify its
shebang before invoking:

```bash
curl -fsSLo /tmp/als https://raw.githubusercontent.com/initial2024/avenqir-site/main/site/al-setup.txt
test "$(head -n 1 /tmp/als)" = '#!/usr/bin/env bash'
bash /tmp/als
```

`AL_SCRIPTS_INSTALLED=YES` confirms the two scripts were put under
`/opt/avenqir`; it does **not** mean Chrome, VNC, Tunnel or Access is
configured. If cgroup RAM is below 2048 MiB, stop, adjust the owner-managed
Sandbox Resources in Altare, then rerun the read-only preflight.

## Preflight before installation

On the original AL Sandbox **Console** (`root@sandbox`), one line at a time:

```bash
mkdir -p /opt/avenqir
curl -fsSLo /opt/avenqir/al_browser_preflight.py https://raw.githubusercontent.com/initial2024/avenqir-site/main/ops/al_browser_preflight.py
python3 /opt/avenqir/al_browser_preflight.py
```

Look for `audit_installed` and `audit_last_result`. If audit files are
present, `audit_installed: true`; a dated `audit_last_result` confirms an
actual run. If absent, the earlier monitor is not confirmed installed.
This status check is **read-only** and does not install a browser, VNC
service or any token.

**Resource stop conditions:** Assigned Sandbox RAM must be >= 2048 MiB
for a conservative Chrome trial and the owner should confirm >= 3 GiB free
quota in Altare's Resources UI. Cgroup RAM limits may be readable inside the
Sandbox. Altare says `df` and `free` can show host node capacity: **do not
interpret a host's disk free space as the Sandbox allocation**. In an
under-provisioned Sandbox, do not install or enable a graphical browser.
Also confirm the project is amd64 Ubuntu/Debian; Firefox snap from Ubuntu
cannot simply substitute for Chrome inside this container.

### Short mobile check, no installation

After the AVENQIR site deploy is complete, use these two short commands
in the **same existing** Altare Sandbox console:

```sh
curl -fsSLo /tmp/als https://avenqir.bg5.net/al-check.txt
bash /tmp/als
```

The first command only downloads a public diagnostics script; the second
performs **read-only local checks**. Inspect the script first if unsure:
https://github.com/initial2024/avenqir-site/blob/main/site/al-check.txt

If `audit_installed` is false, the earlier collector hasn't been verified
as installed even if the shell returned without an error. If it is true and
`audit_last_result` has a date, that proves a prior run wrote a report.
This does **not** prove the private Chrome or Cloudflare Access is installed.

## Optional browser installation (explicit action)

After checking the scripts in GitHub, on the AL Console:

```bash
curl -fsSLo /opt/avenqir/al_private_browser.sh https://raw.githubusercontent.com/initial2024/avenqir-site/main/ops/al_private_browser.sh
bash /opt/avenqir/al_private_browser.sh install
bash /opt/avenqir/al_private_browser.sh password
bash /opt/avenqir/al_private_browser.sh start
bash /opt/avenqir/al_private_browser.sh status
```

`install` downloads Google Chrome's amd64 .deb from `dl.google.com` and
installs Xvfb/x11vnc/openbox and runtime packages from Ubuntu/Debian apt
repositories; it is neither lightweight nor no-risk. It stops early if memory
is below 2 GiB or the cgroup memory limit cannot be proven.

### Altare console does not support password prompts (observed)

If `bash /opt/avenqir/al_private_browser.sh password` or direct
`x11vnc -storepasswd /var/lib/albrowser/.vnc/passwd` returns immediately
to `root@sandbox:~#` **without a prompt**, do not keep entering your
chosen password into the command field. A web-command console may
lack a persistent interactive TTY. Instead run:

```bash
bash /opt/avenqir/al_private_browser.sh password-auto
```

This command uses Python's cryptographic random generator **inside the
existing AL Sandbox** to generate an 8-character VNC password, stores
the obfuscated VNC authentication file with owner `albrowser` and mode
0600, then prints the password **exactly once** in the AL console.
Save it privately before clearing the console; **do not send a screenshot
of this output or the password to ChatGPT**. The implementation briefly
passes the secret to a local `x11vnc -storepasswd pass file` subprocess;
process-inspection by another local privileged user can see it during
creation. The sandbox must be owner-only, VNC localhost-only, and
Cloudflare Access must authenticate the owner before any remote
connection. `password-auto` does not rotate an already existing
nonempty password file, so it cannot silently break an established
desktop session.

Do **not** send the VNC password in ChatGPT. Its protocol effectively uses
an 8-character password; use an unrelated random password and require a
Cloudflare Access identity gate in front. In the shared Sandbox all browser
profile files are private to the dedicated OS user. Do not run Chrome as root
or add `--no-sandbox` to force it to launch; if its sandbox is blocked,
**stop**. Never expose VNC on `0.0.0.0` or open port 5901 in the Altare
Network page.

The script does not install or start `cloudflared` and cannot claim web
reachability. It does not create Cloudflare DNS, tunnels, Access apps or
policies without an explicit owner-selected Cloudflare account and hostname.

## Password setup when Altare has no interactive stdin

The Altare web shell can immediately return to `root@sandbox:~#` after
`x11vnc -storepasswd` without prompting. This means no usable password was
created, not that the chosen password is wrong. **Never paste the password
into a root shell command.**

Update the AL scripts from the trusted GitHub source using the existing
mobile bootstrap:

```bash
curl -fsSLo /tmp/als https://raw.githubusercontent.com/initial2024/avenqir-site/main/site/al-setup.txt
test "$(head -n 1 /tmp/als)" = '#!/usr/bin/env bash' && bash /tmp/als
bash /opt/avenqir/al_private_browser.sh password-auto
```

The `password-auto` command generates a new 8-character random VNC
password on AL, sends it to x11vnc via **stdin pipe (not process arguments
or shell history)**, and creates a mode-0600 password file owned by
`albrowser`. It does not display your password immediately. The
one-time plaintext copy is temporarily placed in the root-only file
`/root/.al-vnc-password-once`, with mode 0600. This is a temporary
handling mechanism: the VNC password file itself uses reversible
obfuscation and Cloudflare Access identity authentication is mandatory.

To see the password once and remove its plaintext copy, **only when your
phone screen is private**, run:

```bash
bash /opt/avenqir/al_private_browser.sh password-reveal
```

Store the resulting password in a private password manager.
**Never send screenshots containing the generated password**, never paste
it into ChatGPT, GitHub or AVENQIR. The encrypted-format x11vnc password
file remains, so you can then start the private VNC process. The script
refuses to overwrite an existing password; do not rerun `password-auto`
to rotate an unknown credential.

## Private HTTPS browser UI (Cloudflare Access)

Official guide:
https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/use-cases/vnc-browser-rendering/

1. In your **correct personal Cloudflare account** with an active domain,
   create a *remotely managed Cloudflare Tunnel* dedicated to AL. Do **not**
   share its token or paste it into GitHub, the AVENQIR website or ChatGPT.
   Install and run the `cloudflared` connector **inside AL**, using the
   authorized command from the Cloudflare dashboard. The tunnel's connector
   must be able to reach `localhost:5901` *on that same AL Sandbox*.
2. Publish one hostname belonging to your domain (for example
   `remote.<your-controlled-domain>`) with **TCP** to `localhost:5901`.
   The host is an example, **not** a ready-made URL.
3. Before opening it to any user, create a Cloudflare Access
   **Self-hosted and private** application on that exact hostname,
   enable **browser-rendered VNC** and add an **Allow** rule only for your
   own authenticated identity. No `Bypass` or anonymous policies. Prefer
   an IdP with MFA; verify a private/incognito session cannot reach
   the VNC desktop before authenticating.
4. Open the hostname in your phone browser. Sign in to Cloudflare Access
   and then enter the VNC password locally. AVENQIR can link to this
   preconfigured protected hostname, but should not embed the Access login
   or share cookies. After use, disconnect/close VNC and stop if you do not
   need it active.

Access/VNC browser rendering is documented by Cloudflare, but actual
entitlement/policy settings and private-domain DNS require **real dashboard
verification**. A successful test of port 5901 on loopback is not a
successful end-to-end browser session.

## Acceptance and rollback

* `python3 /opt/avenqir/al_browser_preflight.py` shows audit
  state, cgroup RAM, and local VNC reachability (no secrets).
* `bash /opt/avenqir/al_private_browser.sh status` shows local
  Xvfb, Chrome and VNC processes.
* `ss -lnt` shows **127.0.0.1:5901**, NOT
  `0.0.0.0:5901` or public Altare ports.
* After Cloudflare setup, an unauthorized browser must be **Access denied**.
* Authorized phone can click/type/scroll in remote Chrome, visit an
  ordinary permitted HTTPS test page, and confirm that page observes the
  *server* exit, not the mobile exit. This is an actual manual E2E test;
  neither a screenshot nor a code commit substitutes for it.
* Try a real page with typing, navigation, downloads and return-after-
  background on the phone. Some sites detect DC IPs and remote browser
  fingerprints. No claims of CAPTCHA or risk-control bypass.
* To stop: `bash /opt/avenqir/al_private_browser.sh stop`;
  disable/remove its Cloudflare Tunnel route and Access app, revoke tunnel
  token. Browser profile lives at `/var/lib/albrowser/browser-profile`.
  Do not remove it until you have intentionally exported needed data.

**AL public monitoring** is independent and remains read-only under
`/opt/avenqir`; **Orbit Android signing** is a separate GitHub repository
with Production-approval constraints. No cross-service secrets are shared.
