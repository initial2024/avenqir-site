#!/usr/bin/env bash
# Private OWNER-ONLY graphical browser for an existing Altare Sandbox.
# Commands: check | install | password | password-auto | start | stop | status
# Never makes any VNC port public; Cloudflare Access/Tunnel configured separately.
set -euo pipefail
umask 077
BASE="/opt/avenqir/private-browser"
PROFILE="/var/lib/albrowser"
U="albrowser"
D=":88"
VNC_PORT=5901

fail(){ printf 'AL_BROWSER_DENY: %s\n' "$*" >&2; exit 2; }
need_root(){ [ "$(id -u)" = 0 ] || fail "Run as root in your Altare Sandbox"; }
require_installed(){ command -v Xvfb >/dev/null && command -v x11vnc >/dev/null && command -v google-chrome-stable >/dev/null || fail "Run install first"; id "$U" >/dev/null 2>&1 || fail "Missing isolated OS account"; }
ram_limit(){
  local x
  for p in /sys/fs/cgroup/memory.max /sys/fs/cgroup/memory/memory.limit_in_bytes; do
    [ -f "$p" ] || continue
    x="$(cat "$p")"
    [[ "$x" =~ ^[0-9]+$ ]] || continue
    [ "$x" -lt 1152921504606846976 ] || continue
    printf '%s' "$x"
    return 0
  done
  return 1
}
check(){
  need_root
  command -v python3 >/dev/null || fail "python3 required"
  if [ -f /opt/avenqir/al_browser_preflight.py ]; then
    python3 /opt/avenqir/al_browser_preflight.py
  else
    echo "AL_PREFLIGHT_SCRIPT_NOT_INSTALLED"
    echo "Download ops/al_browser_preflight.py from the exact owner repository before installing"
    exit 2
  fi
}
install_browser(){
  need_root
  command -v apt-get >/dev/null || fail "Only apt-based Ubuntu/Debian Sandboxes are supported"
  [ "$(dpkg --print-architecture)" = amd64 ] || fail "Only amd64 is supported"
  . /etc/os-release
  case "$ID" in ubuntu|debian) ;; *) fail "Only Ubuntu or Debian supported";; esac
  local bytes
  bytes="$(ram_limit)" || fail "Sandbox cgroup memory limit cannot be determined. Check Altare Resources (not host free/nproc)."
  [ "$bytes" -ge $((2 * 1024 * 1024 * 1024)) ] || fail "Allocate >=2048 MiB to Sandbox before Chrome install"
  # Altare reports df usage for the shared host; confirm your Sandbox disk quota
  # in Altare's Resources UI (recommended 3 GiB available) before continuing.
  echo "AL_BROWSER_RESOURCE_PRECHECK=MEMORY_OK"
  echo "NOTICE: The app disk quota cannot be proven using df inside a Sandbox."
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  local alsa="libasound2t64"
  if ! apt-cache show "$alsa" >/dev/null 2>&1; then
    alsa="libasound2"
  fi
  apt-get install -y --no-install-recommends \
    ca-certificates curl xvfb x11vnc openbox dbus-x11 fonts-liberation \
    libnss3 libgbm1 "$alsa" procps xauth iproute2
  local tmp
  tmp="$(mktemp --suffix=.deb)"
  trap 'rm -f "$tmp"' EXIT
  curl --proto '=https' --tlsv1.2 -fsSL --retry 2 --max-time 180 \
    https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -o "$tmp"
  apt-get install -y --no-install-recommends "$tmp"
  rm -f "$tmp"
  trap - EXIT
  if ! id "$U" >/dev/null 2>&1; then
    useradd --system --create-home --home-dir "$PROFILE" --shell /usr/sbin/nologin "$U"
  fi
  install -d -m 0700 -o "$U" -g "$U" "$PROFILE" "$PROFILE/.vnc" "$BASE"
  command -v google-chrome-stable >/dev/null || fail "Chrome installation incomplete"
  echo "AL_BROWSER_PACKAGES_INSTALLED=YES"
  echo "NEXT: bash /opt/avenqir/al_private_browser.sh password"
  echo "THEN: bash /opt/avenqir/al_private_browser.sh start"
  echo "NOTE: Google Chrome must start with its own sandbox; no --no-sandbox bypass."
}
set_password(){
  need_root
  require_installed
  echo "Set an interactive VNC password in this console. Do not share it here or in GitHub."
  echo "VNC password is limited to the first 8 characters. Cloudflare Access is mandatory as a separate protection."
  rm -f "$PROFILE/.vnc/passwd"
  if [ -r /dev/tty ] && [ -w /dev/tty ]; then
    echo "AL_VNC_PASSWORD_PROMPT=TTY"
    x11vnc -storepasswd "$PROFILE/.vnc/passwd" </dev/tty >/dev/tty 2>&1 || fail "Interactive VNC password prompt failed"
  elif [ -t 0 ]; then
    echo "AL_VNC_PASSWORD_PROMPT=STDIN"
    x11vnc -storepasswd "$PROFILE/.vnc/passwd" || fail "Interactive VNC password prompt failed"
  else
    fail "No interactive terminal is available for safe password entry"
  fi
  [ -s "$PROFILE/.vnc/passwd" ] || fail "No VNC password file saved"
  chmod 0600 "$PROFILE/.vnc/passwd"
  chown "$U:$U" "$PROFILE/.vnc/passwd"
  echo "AL_VNC_PASSWORD_SET=YES"
}
# Altare's command-box terminal often cannot provide a live interactive TTY.
# Generate an 8-character 48-bit secret INSIDE AL; show exactly once on screen.
# x11vnc -storepasswd pass file exposes the pass briefly to local process
# inspection, so this path is only for single-owner isolated Sandboxes, with
# loopback-only VNC and Cloudflare Access mandatory.
set_password_auto(){
  need_root
  require_installed
  command -v python3 >/dev/null || fail "python3 needed to generate random password"
  if [ -s "$PROFILE/.vnc/passwd" ]; then
    echo "AL_VNC_PASSWORD_ALREADY_SET=YES"
    echo "Existing password was not rotated. Use the currently saved password."
    return 0
  fi
  local generated tmp
  generated="$(python3 -c 'import secrets;print(secrets.token_urlsafe(6))')" || fail "Random generator failed"
  [ "${#generated}" -eq 8 ] || fail "Unexpected random password length"
  tmp="$(mktemp "$PROFILE/.vnc/.passwd.XXXXXXXX")" || fail "Cannot create private password file"
  if ! x11vnc -storepasswd "$generated" "$tmp" >/dev/null 2>&1 || [ ! -s "$tmp" ]; then
    rm -f "$tmp"
    unset generated
    fail "Failed to create VNC authentication file"
  fi
  chmod 0600 "$tmp"
  chown "$U:$U" "$tmp"
  mv -f "$tmp" "$PROFILE/.vnc/passwd"
  echo "AL_VNC_PASSWORD_SET=YES"
  echo "AL_VNC_PASSWORD_MODE=AUTOGENERATED_ON_MACHINE"
  printf 'VNC_PASSWORD=%s\n' "$generated"
  echo "Save this 8-character password privately NOW; it will not be displayed again."
  echo "Do not paste your password or screenshot into ChatGPT or GitHub."
  unset generated
}
set_password_auto(){
  need_root
  require_installed
  [ -f /opt/avenqir/al_vnc_password_auto.py ] || fail "Download the new al_vnc_password_auto.py helper first"
  python3 /opt/avenqir/al_vnc_password_auto.py setup
}
reveal_password_once(){
  need_root
  [ -f /opt/avenqir/al_vnc_password_auto.py ] || fail "Missing auto password helper"
  python3 /opt/avenqir/al_vnc_password_auto.py reveal
}
start_browser(){
  need_root
  require_installed
  [ -s "$PROFILE/.vnc/passwd" ] || fail "First run password; VNC without a password is forbidden"
  install -d -m 0700 -o "$U" -g "$U" "$PROFILE/.config" "$PROFILE/.config/google-chrome"
  # Using a dedicated OS user keeps Chrome isolated from /root, private audit
  # reports and the Cloudflare tunnel credential; never run Chrome as root.
  if ! pgrep -u "$U" -x Xvfb >/dev/null; then
    runuser -u "$U" -- sh -c 'nohup Xvfb :88 -screen 0 1280x720x24 -nolisten tcp > "$HOME/xvfb.log" 2>&1 </dev/null &'
    sleep 2
  fi
  pgrep -u "$U" -x Xvfb >/dev/null || fail "Virtual display failed; inspect $PROFILE/xvfb.log"
  if ! pgrep -u "$U" -x openbox >/dev/null; then
    runuser -u "$U" -- sh -c 'DISPLAY=:88 nohup openbox-session > "$HOME/openbox.log" 2>&1 </dev/null &'
  fi
  if ! pgrep -u "$U" -f '/opt/google/chrome/chrome.*--user-data-dir=' >/dev/null; then
    runuser -u "$U" -- sh -c 'DISPLAY=:88 nohup google-chrome-stable --no-first-run --no-default-browser-check --disable-sync --disable-dev-shm-usage --user-data-dir="$HOME/browser-profile" https://example.com > "$HOME/browser.log" 2>&1 </dev/null &'
  fi
  if ! pgrep -u "$U" -x x11vnc >/dev/null; then
    runuser -u "$U" -- sh -c 'DISPLAY=:88 nohup x11vnc -display :88 -localhost -rfbport 5901 -rfbauth "$HOME/.vnc/passwd" -forever -shared -quiet > "$HOME/vnc.log" 2>&1 </dev/null &'
  fi
  sleep 2
  command -v ss >/dev/null || fail "iproute2/ss unavailable; cannot verify loopback-only VNC listener"
  if command -v ss >/dev/null; then
    ss -ltn | grep -Eq '127\.0\.0\.1:5901[[:space:]]' || fail "VNC did not bind 127.0.0.1:5901 (no public fallback)"
    if ss -ltn | grep -Eq '(^|[[:space:]])(0\.0\.0\.0|\*):5901[[:space:]]'; then
      fail "Unexpected publicly reachable VNC interface: STOP and inspect"
    fi
  fi
  if ! pgrep -u "$U" -f '/opt/google/chrome/chrome.*--user-data-dir=' >/dev/null; then
    fail "Chrome is not running; inspect $PROFILE/browser.log; do not disable Chrome sandbox"
  fi
  echo "AL_PRIVATE_VNC_LOCAL_ONLY=YES"
  echo "Open Chrome via Cloudflare Tunnel TCP localhost:5901 + Access VNC browser rendering."
  echo "NEVER publish the VNC port directly in Altare Network."
  echo "IMPORTANT: if Chrome sandbox cannot launch, inspect $PROFILE/browser.log; DO NOT add --no-sandbox."
}
stop_browser(){
  need_root
  if id "$U" >/dev/null 2>&1; then
    for proc in x11vnc openbox chrome Xvfb; do
      pkill -u "$U" -x "$proc" 2>/dev/null || true
    done
    pkill -u "$U" -f '/opt/google/chrome/chrome' 2>/dev/null || true
  fi
  echo "AL_PRIVATE_BROWSER_STOP_REQUESTED"
}
status_browser(){
  need_root
  if id "$U" >/dev/null 2>&1; then
    printf 'AL_XVFB=%s\n' "$(pgrep -u "$U" -x Xvfb >/dev/null && echo RUNNING || echo STOPPED)"
    printf 'AL_VNC=%s\n' "$(pgrep -u "$U" -x x11vnc >/dev/null && echo RUNNING || echo STOPPED)"
    printf 'AL_CHROME=%s\n' "$(pgrep -u "$U" -f '/opt/google/chrome/chrome.*--user-data-dir=' >/dev/null && echo RUNNING || echo UNKNOWN_OR_STOPPED)"
  else
    echo "AL_BROWSER_NOT_INSTALLED"
  fi
  command -v ss >/dev/null && ss -ltn | grep '5901' || true
  echo "AL_ACCESS_TUNNEL_STATUS=NOT_CHECKED"
}
case "${1:-}" in
  check) check ;;
  install) install_browser ;;
  password) set_password ;;
  password-auto) set_password_auto ;;
  password-reveal) reveal_password_once ;;
  password-auto) set_password_auto ;;
  start) start_browser ;;
  status) status_browser ;;
  stop) stop_browser ;;
  *) echo "Usage: bash al_private_browser.sh check|install|password|password-auto|start|status|stop"; exit 2 ;;
esac
