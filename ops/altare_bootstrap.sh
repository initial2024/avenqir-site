#!/usr/bin/env bash
# One-time, explicit owner setup for the Altare Ubuntu Sandbox.
# Never sends credentials or modifies the AVENQIR production website.
set -euo pipefail
umask 077
if [[ "${EUID}" != "0" ]]; then
  echo "Run as root in the Altare Sandbox console."
  exit 2
fi
command -v python3 >/dev/null || { echo "python3 is required"; exit 2; }
command -v curl >/dev/null || { echo "curl is required"; exit 2; }
install -d -m 700 /opt/avenqir /opt/avenqir/reports /opt/avenqir/state /root/.config/avenqir
ROOT="https://raw.githubusercontent.com/initial2024/avenqir-site/main/ops"
for script in altare_readonly_audit.py altare_cross_region_report.py; do
  tmp="$(mktemp)"
  if ! curl --proto '=https' --tlsv1.2 --fail --location --silent --show-error \
     --retry 2 --max-time 40 "$ROOT/$script" -o "$tmp"; then
    rm -f "$tmp"
    echo "DOWNLOAD_FAILED: $script"
    exit 3
  fi
  install -m 700 "$tmp" "/opt/avenqir/$script"
  rm -f "$tmp"
done
# Install only the public, read-only scheduled check launcher. This does NOT
# register a schedule, run a daemon, modify Chrome/VNC, or access passwords.
tmp="$(mktemp)"
if ! curl --proto '=https' --tlsv1.2 --fail --location --silent --show-error \
   --retry 2 --max-time 40 "$ROOT/altare_scheduled_check.sh" -o "$tmp"; then
  rm -f "$tmp"
  echo "DOWNLOAD_FAILED: altare_scheduled_check.sh"
  exit 3
fi
bash -n "$tmp"
install -m 700 "$tmp" /opt/avenqir/altare_scheduled_check.sh
rm -f "$tmp"
bash -n /opt/avenqir/altare_scheduled_check.sh

python3 -m py_compile /opt/avenqir/altare_readonly_audit.py \
                       /opt/avenqir/altare_cross_region_report.py

echo "=== FIRST ACTUAL ALTARE CHECK (LOCAL ONLY) ==="
python3 /opt/avenqir/altare_cross_region_report.py --sample 10 --local-only
echo ""
echo "=== OPTIONAL AUTOMATIC GITHUB COMMENT SETUP ==="
echo "1. Make a GitHub fine-grained token restricted to this repo ONLY:"
echo "   https://github.com/settings/personal-access-tokens/new"
echo "   Repository: initial2024/avenqir-site; repository permission Issues: Read and Write"
echo "2. In THIS console, input the token using the commands from:"
echo "   https://github.com/initial2024/avenqir-site/blob/main/ops/ALTARE_SETUP.md"
echo "3. Altare Console > this Sandbox > Schedules > Add command, e.g."
echo "   bash /opt/avenqir/altare_scheduled_check.sh"
echo "   Run once per day (UTC), 03:10 UTC recommended. No systemd or Docker needed.\n   Scheduling is NOT installed by bootstrap; verify Altare schedule run history."
echo "=== BOOTSTRAP COMPLETE ==="
