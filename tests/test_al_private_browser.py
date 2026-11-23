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
        self.assertIn('x11vnc -display "$1" -localhost -rfbport 5901 -rfbauth', source)
        self.assertIn('DISPLAY="$1" nohup google-chrome-stable', source)
        self.assertIn('DISPLAY="$1" nohup openbox-session', source)
        self.assertIn('nohup Xvfb "$1" -screen 0 1280x720x24 -nolisten tcp', source)
        self.assertIn('select_browser_display', source)
        self.assertIn('for n in {89..99}', source)
        self.assertIn('managed_xvfb "$D"', source)
        self.assertIn('AL_SELECTED_DISPLAY=$D', source)
        self.assertIn('AL_XVFB_DISPLAY=:$n', source)
        self.assertIn('"/tmp/.X${n}-lock"', source)
        self.assertIn('"/tmp/.X11-unix/X${n}"', source)
        self.assertNotIn('Xvfb :88 -screen', source)
        self.assertNotIn('DISPLAY=:88 nohup', source)
        self.assertNotIn('rm -f /tmp/.X88-lock', source)
        self.assertNotIn('kill 7375', source)
        self.assertIn(r"127\.0\.0\.1:5901", source)
        self.assertIn('runuser -u "$U" -- sh -c', source)
        self.assertIn("google-chrome-stable", source)
        self.assertNotIn("x11vnc -nopw", source)
        self.assertNotIn("cloudflared tunnel --url", source)
        self.assertNotIn("systemctl", source)
        self.assertIn('PROFILE/.al-xvfb.${number}.pid', source)
        self.assertIn('mapfile -d', source)
        self.assertIn('"/proc/$pid/status"', source)
        self.assertIn('id -u "$U"', source)
        self.assertIn('actual_uid', source)
        self.assertIn('"/tmp/.X11-unix/X${number}"', source)
        self.assertIn('xpid=$!', source)
        self.assertIn('chmod 0600 "$HOME/.al-xvfb.', source)
        self.assertIn('AL_XVFB_DISPLAY=:$n', source)
        self.assertNotIn('pgrep -u "$U" -f "^Xvfb', source)
        self.assertNotIn('pkill -u "$U" -x "Xvfb"', source)
        self.assertNotIn('kill 7427', source)
        self.assertNotIn('kill 7375', source)

        self.assertIn("AL_PRIVATE_VNC_LOCAL_ONLY=YES", source)

    def test_altare_user_namespace_uid_mismatch_blocks_new_displays(self):
        source = SETUP.read_text()
        start = source[source.index("start_browser(){"):source.index("diagnose_browser(){")]
        # Preflight must run before selecting/spawning a new Xvfb.
        self.assertLess(start.index("uid_mapping_guard"), start.index("select_browser_display"))
        self.assertIn('runuser -u "$U" -- id -u', source)
        self.assertIn('expected="$(id -u "$U")"', source)
        self.assertIn('AL_UID_EXPECTED=$expected', source)
        self.assertIn('AL_UID_RUNUSER=$observed', source)
        self.assertIn('uid-check) need_root; uid_mapping_diagnostic ;;', source)
        self.assertIn('recorded Xvfb :$n PID $pid runs as UID $uid', source)
        self.assertIn('refusing to spawn another display', source)
        self.assertNotIn('kill 7537', source)
        self.assertNotIn('rm /tmp/.X91-lock', source)

    def test_short_lived_uid_probe_cannot_create_more_displays(self):
        source = SETUP.read_text()
        probe = source[source.index("uid_child_probe(){"):source.index("uid_mapping_guard(){")]
        self.assertIn('uid-probe) uid_child_probe ;;', source)
        self.assertIn('runuser -u "$U" -- sh -c', probe)
        self.assertIn('sleep 3 >/dev/null 2>&1 &', probe)
        self.assertIn('wait "$child"', probe)
        self.assertIn('AL_PROBE_CHILD_UID=', probe)
        self.assertIn('AL_PROBE_COMPLETE=YES', probe)
        self.assertIn('AL_XVFB_BINARY_MODE=', probe)
        self.assertNotIn('Xvfb :', probe)
        self.assertNotIn('x11vnc', probe)
        self.assertNotIn('google-chrome-stable', probe)
        self.assertNotIn('kill ', probe)
        self.assertNotIn('rm -f ', probe)

    def test_auto_uses_pipe_not_process_arguments(self):
        shell=SETUP.read_text()
        helper=(ROOT/"ops/al_vnc_password_auto.py").read_text()
        bootstrap=(ROOT/"site/al-setup.txt").read_text()
        self.assertIn("password-auto) set_password_auto ;;",shell)
        self.assertIn("password-reveal) reveal_password_once ;;",shell)
        self.assertIn("al_vnc_password_auto.py",bootstrap)
        self.assertIn("secrets.choice(CHARS)",helper)
        self.assertIn("input=password +",helper)
        self.assertIn("stderr=subprocess.PIPE",helper)
        self.assertIn("stdout=subprocess.DEVNULL",helper)
        self.assertIn("O_EXCL",helper)
        self.assertNotIn("shell=True",helper)
        self.assertNotIn('x11vnc -storepasswd "$generated"',shell)

    def test_auto_credential_written_then_root_copy_revealed_once(self):
        import contextlib
        import importlib.util
        import io
        import os
        import tempfile
        from types import SimpleNamespace
        from unittest.mock import patch
        spec=importlib.util.spec_from_file_location(
            "al_vnc_password_auto",ROOT/"ops/al_vnc_password_auto.py")
        mod=importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        with tempfile.TemporaryDirectory() as folder:
            v=Path(folder)/"passwd"
            one=Path(folder)/"one-time"
            observed=[]
            def fake_run(args,**kwargs):
                self.assertEqual(args,["x11vnc","-storepasswd",str(v)])
                first=kwargs["input"].splitlines()[0]
                self.assertEqual(kwargs["input"],first+"\n"+first+"\ny\n")
                self.assertEqual(len(first),8)
                observed.append(first)
                v.write_bytes(b"abcdefgh")
                return SimpleNamespace(returncode=0)
            result_output=io.StringIO()
            with patch.object(mod.subprocess,"run",side_effect=fake_run):
                with contextlib.redirect_stdout(result_output):
                    ret=mod.setup(v,one,os.getuid(),os.getgid())
            self.assertEqual(ret,0)
            self.assertEqual(v.stat().st_size,8)
            self.assertEqual(one.stat().st_mode & 0o777,0o600)
            self.assertNotIn(observed[0],result_output.getvalue())
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(mod.setup(v,one,os.getuid(),os.getgid()),2)
                self.assertEqual(mod.reveal(one),0)
            self.assertFalse(one.exists())
            self.assertTrue(v.exists())

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
