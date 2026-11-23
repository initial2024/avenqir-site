#!/usr/bin/env bash
# AVENQIR AL daily public-only audit. This job does not read tokens or open ports.
# Install/update with ops/altare_bootstrap.sh. Schedule from Altare Sandbox UI.
set -Eeuo pipefail
umask 077

ROOT=/opt/avenqir
REPORTS="$ROOT/reports"
STATE="$ROOT/state"
SCRIPT="$ROOT/altare_cross_region_report.py"
[[ -f "$SCRIPT" ]] || { echo "AL_MONITOR_MISSING_COLLECTOR"; exit 2; }
command -v python3 >/dev/null || { echo "AL_MONITOR_PYTHON_MISSING"; exit 2; }
command -v flock >/dev/null || { echo "AL_MONITOR_FLOCK_MISSING"; exit 2; }
install -d -m 700 "$REPORTS" "$STATE"

# Only one scheduled check at a time; never spawn an extra long-running process.
exec 9>"$STATE/scheduled-audit.lock"
if ! flock -n 9; then
  echo "AL_MONITOR_BUSY=YES"
  exit 4
fi

start="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
tmp_log="$(mktemp "$REPORTS/.scheduled-log.XXXXXXXX")"
tmp_status="$(mktemp "$STATE/.scheduled-status.XXXXXXXX")"
trap 'rm -f "$tmp_log" "$tmp_status"' EXIT
echo "AL_CHECK_STARTED_UTC=$start"

# No GitHub PAT is consulted. All findings are public-site data, stored locally.
result=0
timeout 550s python3 "$SCRIPT" --sample 20 --local-only > "$tmp_log" 2>&1 || result=$?
end="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
if [ "$result" -eq 0 ] && grep -q '^=== END ALTARE REPORT ===$' "$tmp_log"; then
  health="COMPLETE"
else
  health="FAILED"
  [ "$result" -eq 0 ] && result=5
fi

# Atomic, private last-run evidence; keep one small latest log, not infinite logs.
chmod 600 "$tmp_log"
mv -f "$tmp_log" "$REPORTS/latest-scheduled.log"
printf 'AL_LAST_CHECK_STARTED_UTC=%s\nAL_LAST_CHECK_ENDED_UTC=%s\nAL_LAST_CHECK_RESULT=%s\nAL_LAST_EXIT_CODE=%s\nAL_LAST_REPORT=%s\n' \
  "$start" "$end" "$health" "$result" "$REPORTS/latest-scheduled.log" > "$tmp_status"
chmod 600 "$tmp_status"
mv -f "$tmp_status" "$STATE/latest-scheduled.status"
echo "AL_LAST_CHECK_RESULT=$health"
echo "AL_LAST_EXIT_CODE=$result"
echo "AL_LAST_CHECK_ENDED_UTC=$end"
exit "$result"
