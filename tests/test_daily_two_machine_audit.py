"""Monitor scheduling safety: workflow cadence, no secrets and no destructive AL operations."""
import pathlib
import subprocess
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github/workflows/weekly-public-readonly-audit.yml"
RUNNER = ROOT / "ops/altare_scheduled_check.sh"
BOOTSTRAP = ROOT / "ops/altare_bootstrap.sh"

class DualMachineMonitorTests(unittest.TestCase):
    def test_daily_github_public_audit_uses_one_issue(self):
        workflow = WORKFLOW.read_text(encoding="utf-8")
        self.assertIn('cron: "23 2 * * *"', workflow)
        self.assertIn('publish_readonly_issue.py', workflow)
        self.assertIn('issues: write', workflow)
        self.assertIn('retention-days: 30', workflow)

    def test_scheduled_runner_bash_syntax_and_local_only(self):
        self.assertEqual(subprocess.run(["bash", "-n", str(RUNNER)],
                       capture_output=True, check=False).returncode, 0)
        script = RUNNER.read_text(encoding="utf-8")
        self.assertIn('--local-only', script)
        self.assertIn('flock -n 9', script)
        self.assertIn('latest-scheduled.status', script)
        self.assertIn('latest-scheduled.log', script)
        self.assertIn('=== END ALTARE REPORT ===', script)
        for forbidden in ('GITHUB_TOKEN', 'github_issue_token', 'curl -k',
                          'pkill', 'kill -9', 'rm -rf', 'x11vnc', 'nohup',
                          'localhost:5901', 'Authorization: Bearer'):
            self.assertNotIn(forbidden, script)

    def test_bootstrap_installs_runner_without_touching_browser(self):
        script = BOOTSTRAP.read_text(encoding="utf-8")
        self.assertIn('altare_scheduled_check.sh', script)
        self.assertIn('bash -n /opt/avenqir/altare_scheduled_check.sh', script)
        self.assertNotIn('al_private_browser.sh', script)
        self.assertNotIn('cloudflared', script)

if __name__ == "__main__":
    unittest.main()
