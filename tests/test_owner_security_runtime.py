from pathlib import Path
import os, shutil, subprocess, tempfile, unittest
ROOT=Path(__file__).resolve().parents[1]
class OwnerSecurityRuntime(unittest.TestCase):
    def test_actual_authenticated_page_and_admin_route(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            for n in ['server-core.php','admin-security.php','feedback-core.php','feedback-abuse.php','feedback-turnstile.php','owner-feedback-security.php','admin.php']:
                shutil.copyfile(ROOT/'site'/n,root/n)
            # Private synthetic data only, no production credentials or files.
            setup=root/'fixture.php'
            setup.write_text("""<?php
require __DIR__.'/server-core.php';
require __DIR__.'/admin-security.php';
$a=['username'=>'adm','password_hash'=>'synthetic-test'];
if(!stored_write('auth',$a))exit(9);
session_save_path(__DIR__);
session_name('AVENQIR_ADMIN');
session_id('owner-test-fixture');
session_start();
$_SESSION=['logged'=>true,'until'=>time()+1800,'auth_tag'=>aq_auth_tag($a),'csrf'=>str_repeat('a',48)];
session_write_close();
""")
            subprocess.run(['php',str(setup)],check=True,capture_output=True)
            runner=root/'runner.php'
            runner.write_text("""<?php
$_SERVER['HTTPS']='on';$_SERVER['REQUEST_METHOD']='GET';
session_save_path(__DIR__);
$_COOKIE['AVENQIR_ADMIN']='owner-test-fixture';
if($argv[1]==='admin.php')$_GET['view']='feedback-security';
require __DIR__.'/'.$argv[1];
""")
            for target in ['owner-feedback-security.php','admin.php']:
                r=subprocess.run(['php',str(runner),target],check=True,capture_output=True,text=True)
                self.assertIn('防滥用测试与配置',r.stdout,r.stderr)
                self.assertIn('本机挑战',r.stdout)
                self.assertIn('name="human_answer"',r.stdout)
                self.assertIn('本机算术挑战',r.stdout)
                self.assertNotIn('synthetic-test',r.stdout)
                self.assertNotIn('Fatal error',r.stderr)
            self.assertFalse((root/'_store'/'feedback_quota.php').exists())
