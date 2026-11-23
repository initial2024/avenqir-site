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

    def test_password_auto_no_tty_no_shell_history_secret(self):
        source=SETUP.read_text()
        helper=(ROOT/"ops/al_vnc_password_auto.py").read_text()
        mobile=(ROOT/"site/al-setup.txt").read_text()
        self.assertIn('password-auto) set_password_auto ;;', source)
        self.assertIn('password-reveal) reveal_password_once ;;', source)
        self.assertIn('al_vnc_password_auto.py', mobile)
        self.assertIn('secrets.choice(CHARS)', helper)
        self.assertIn("input=password +", helper)
        self.assertIn("stdout=subprocess.DEVNULL", helper)
        self.assertIn("stderr=subprocess.PIPE", helper)
        self.assertIn("AL_VNC_PASSWORD_SET=YES", helper)
        self.assertIn("O_EXCL", helper)
        self.assertNotIn("shell=True", helper)
        self.assertNotIn("x11vnc -nopw", source)

    def test_random_password_uses_pipe_and_one_time_root_file(self):
        import contextlib
        import importlib.util
        import io
        import os
        import tempfile
        from types import SimpleNamespace
        from unittest.mock import patch
        spec=importlib.util.spec_from_file_location(
            "al_vnc_password_auto", ROOT/"ops/al_vnc_password_auto.py")
        module=importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as folder:
            passfile=Path(folder)/"passwd"
            onefile=Path(folder)/"root-only"
            secret_seen=[]
            def fake_x11vnc(args, **kwargs):
                self.assertEqual(args, ["x11vnc","-storepasswd",str(passfile)])
                stdin_text=kwargs["input"]
                password=stdin_text.splitlines()[0]
                self.assertEqual(stdin_text,password+"\\n"+password+"\\ny\\n")
                self.assertEqual(len(password),8)
                secret_seen.append(password)
                passfile.write_bytes(b"12345678")
                return SimpleNamespace(returncode=0)
            out=io.StringIO()
            with patch.object(module.subprocess,"run",side_effect=fake_x11vnc):
                with contextlib.redirect_stdout(out):
                    result=module.setup(passfile,onefile,os.getuid(),os.getgid())
            self.assertEqual(result,0)
            self.assertEqual(passfile.stat().st_size,8)
            self.assertEqual(onefile.stat().st_mode&0o777,0o600)
            self.assertNotIn(secret_seen[0],out.getvalue())
            self.assertEqual(module.setup(passfile,onefile,os.getuid(),os.getgid()),2)
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(module.reveal(onefile),0)
            self.assertFalse(onefile.exists())
            self.assertTrue(passfile.exists())

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
