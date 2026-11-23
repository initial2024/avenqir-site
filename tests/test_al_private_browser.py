"""Security gates for AL's opt-in private browser and noninteractive password setup."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]
SETUP = ROOT / "ops/al_private_browser.sh"
PREFLIGHT = ROOT / "ops/al_browser_preflight.py"
DOC = ROOT / "ops/AL_PRIVATE_BROWSER.md"
PAGE = ROOT / "site/remote-workspace.html"

class ALPrivateBrowserSecurity(unittest.TestCase):
    def test_scripts_pass_offline_syntax(self):
        self.assertEqual(subprocess.run(["bash", "-n", str(SETUP)],
                         capture_output=True, text=True).returncode, 0)
        self.assertEqual(subprocess.run(["python3", "-m", "py_compile", str(PREFLIGHT)],
                         capture_output=True, text=True).returncode, 0)

    def test_vnc_must_be_owner_only_and_localhost(self):
        source = SETUP.read_text()
        self.assertIn("x11vnc -display :88 -localhost -rfbport 5901 -rfbauth", source)
        self.assertIn(r"127\.0\.0\.1:5901", source)
        self.assertIn('runuser -u "$U" -- sh -c', source)
        self.assertIn("google-chrome-stable", source)
        self.assertNotIn("x11vnc -nopw", source)
        self.assertNotIn("cloudflared tunnel --url", source)
        self.assertNotIn("systemctl", source)
        self.assertIn("AL_PRIVATE_VNC_LOCAL_ONLY=YES", source)

    def test_password_auto_no_terminal_and_no_shell_history_secret(self):
        source = SETUP.read_text()
        self.assertIn('password-auto) set_password_auto ;;', source)
        self.assertIn("secrets.token_urlsafe(6)", source)
        self.assertIn('x11vnc -storepasswd "$generated" "$tmp"', source)
        self.assertIn('chmod 0600 "$tmp"', source)
        self.assertIn('chown "$U:$U" "$tmp"', source)
        self.assertIn('mv -f "$tmp" "$PROFILE/.vnc/passwd"', source)
        self.assertIn('AL_VNC_PASSWORD_SET=YES', source)
        self.assertIn('AL_VNC_PASSWORD_ALREADY_SET=YES', source)
        self.assertIn('unset generated', source)
        self.assertNotIn('read -p "Password:', source)
        self.assertNotIn("x11vnc -nopw", source)

    def test_interactive_password_only_when_tty_exists(self):
        source = SETUP.read_text()
        self.assertIn('AL_VNC_PASSWORD_PROMPT=TTY', source)
        self.assertIn('x11vnc -storepasswd "$PROFILE/.vnc/passwd" </dev/tty', source)
        self.assertNotIn('runuser -u "$U" -- x11vnc -storepasswd', source)

    def test_preflight_never_changes_machine(self):
        source = PREFLIGHT.read_text()
        self.assertIn("audit_installed", source)
        self.assertIn("cgroup_memory_limit_mib", source)
        self.assertIn("vnc_localhost_5901_reachable", source)
        self.assertIn('private_browser_operational_proof":False', source)
        self.assertNotIn("subprocess", source)
        self.assertNotIn("os.system(", source)
        self.assertNotIn("urlopen(", source)

    def test_access_requires_owner_auth(self):
        doc = DOC.read_text()
        page = PAGE.read_text()
        self.assertIn("Cloudflare Access", doc)
        self.assertIn("Allow", doc)
        self.assertIn("Cloudflare Access", page)
        self.assertIn("NOT LIVE YET", page)
        self.assertNotIn("docs.altare.gg/workstations/beta", page)

if __name__ == "__main__":
    unittest.main()
