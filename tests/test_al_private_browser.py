"""Contracts for read-only AL diagnosis and opt-in owner-only browser setup."""
import pathlib
import subprocess
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[1]
PREFLIGHT=ROOT/"ops/al_browser_preflight.py"
SETUP=ROOT/"ops/al_private_browser.sh"
DOC=ROOT/"ops/AL_PRIVATE_BROWSER.md"
PAGE=ROOT/"site/remote-workspace.html"

class ALPrivateBrowserSecurity(unittest.TestCase):
    def test_scripts_pass_offline_syntax(self):
        self.assertEqual(subprocess.run(["bash","-n",str(SETUP)],
                       capture_output=True,text=True).returncode,0)
        self.assertEqual(subprocess.run(["python3","-m","py_compile",str(PREFLIGHT)],
                       capture_output=True,text=True).returncode,0)
    def test_no_unprotected_vnc_or_root_browser(self):
        source=SETUP.read_text()
        self.assertIn('x11vnc -display :88 -localhost -rfbport 5901 -rfbauth',source)
        self.assertIn('127\\.0\\.0\\.1:5901',source)
        self.assertIn('runuser -u "$U" -- sh -c',source)
        self.assertIn('google-chrome-stable',source)
        self.assertNotIn('--no-sandbox',source.replace('echo "NOTE: Google Chrome must start with its own sandbox; no --no-sandbox bypass."','').replace('echo "IMPORTANT: if Chrome sandbox cannot launch, inspect $PROFILE/browser.log; DO NOT add --no-sandbox."',''))
        self.assertNotIn("x11vnc -nopw",source)
        self.assertIn('AL_VNC_PASSWORD_PROMPT=TTY',source)
        self.assertIn('x11vnc -storepasswd "$PROFILE/.vnc/passwd" </dev/tty',source)
        self.assertNotIn('runuser -u "$U" -- x11vnc -storepasswd',source)
        self.assertNotIn('-storepasswd "
        self.assertNotIn("cloudflared tunnel --url",source)
        self.assertNotIn("systemctl",source)
        self.assertIn("memory.max",source)
        self.assertIn("AL_PRIVATE_VNC_LOCAL_ONLY=YES",source)
    def test_preflight_never_changes_machine(self):
        source=PREFLIGHT.read_text()
        self.assertIn("audit_installed",source)
        self.assertIn("cgroup_memory_limit_mib",source)
        self.assertIn("vnc_localhost_5901_reachable",source)
        self.assertNotIn("subprocess",source)
        self.assertNotIn("os.system(",source)
        self.assertNotIn("urlopen(",source)
        self.assertIn('private_browser_operational_proof":False',source)
    def test_login_gate_and_no_beta(self):
        doc=DOC.read_text()
        page=PAGE.read_text()
        self.assertIn("Cloudflare Access",doc)
        self.assertIn("Deny",doc) if "Deny" in doc else self.assertIn("Allow",doc)
        self.assertIn("Cloudflare Access",page)
        self.assertIn("NOT LIVE YET",page)
        self.assertNotIn("docs.altare.gg/workstations/beta",page)
        self.assertIn("owner",doc.lower())
        self.assertIn("Only for",doc) if "Only for" in doc else self.assertIn("personal remote",doc)
if __name__=="__main__":
    unittest.main()
,source.replace('-storepasswd "$PROFILE/.vnc/passwd"',''))
        self.assertNotIn("cloudflared tunnel --url",source)
        self.assertNotIn("systemctl",source)
        self.assertIn("memory.max",source)
        self.assertIn("AL_PRIVATE_VNC_LOCAL_ONLY=YES",source)
    def test_preflight_never_changes_machine(self):
        source=PREFLIGHT.read_text()
        self.assertIn("audit_installed",source)
        self.assertIn("cgroup_memory_limit_mib",source)
        self.assertIn("vnc_localhost_5901_reachable",source)
        self.assertNotIn("subprocess",source)
        self.assertNotIn("os.system(",source)
        self.assertNotIn("urlopen(",source)
        self.assertIn('private_browser_operational_proof":False',source)
    def test_login_gate_and_no_beta(self):
        doc=DOC.read_text()
        page=PAGE.read_text()
        self.assertIn("Cloudflare Access",doc)
        self.assertIn("Deny",doc) if "Deny" in doc else self.assertIn("Allow",doc)
        self.assertIn("Cloudflare Access",page)
        self.assertIn("NOT LIVE YET",page)
        self.assertNotIn("docs.altare.gg/workstations/beta",page)
        self.assertIn("owner",doc.lower())
        self.assertIn("Only for",doc) if "Only for" in doc else self.assertIn("personal remote",doc)
if __name__=="__main__":
    unittest.main()
