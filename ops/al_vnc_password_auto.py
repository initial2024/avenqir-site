#!/usr/bin/env python3
"""Generate a VNC password without interactive stdin or command-line secrets.

The 8-character password is delivered to x11vnc via a PIPE, never argv. The
only plaintext copy is a mode-0600 root file, removed on first owner reveal.
"""
import os
from pathlib import Path
import pwd
import secrets
import subprocess
import sys

PASSFILE = Path('/var/lib/albrowser/.vnc/passwd')
ONE_TIME = Path('/root/.al-vnc-password-once')
CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'


def setup(passfile: Path, oncefile: Path, uid: int, gid: int, binary: str = 'x11vnc') -> int:
    if os.path.lexists(passfile) or os.path.lexists(oncefile):
        print('AL_VNC_PASSWORD_AUTO=DENY_EXISTING')
        print('An existing password or unrevealed password exists. Refusing to overwrite.')
        return 2
    if not passfile.parent.is_dir() or passfile.parent.is_symlink() or not oncefile.parent.is_dir():
        print('AL_VNC_PASSWORD_AUTO=DENY_DIRECTORY')
        return 2
    password = ''.join(secrets.choice(CHARS) for _ in range(8))
    try:
        result = subprocess.run(
            [binary, '-storepasswd', str(passfile)],
            input=password + '\n' + password + '\ny\n',
            stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
            text=True, timeout=25, check=False,
        )
        if result.returncode != 0 or not passfile.is_file() or passfile.stat().st_size != 8:
            if os.path.lexists(passfile):
                passfile.unlink()
            print('AL_VNC_PASSWORD_AUTO=DENY_STORE_FAILED')
            return 3
        os.chmod(passfile, 0o600)
        os.chown(passfile, uid, gid)
        fd = os.open(oncefile, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        with os.fdopen(fd, 'w', encoding='ascii') as private_copy:
            private_copy.write(password + '\n')
            private_copy.flush()
            os.fsync(private_copy.fileno())
        print('AL_VNC_PASSWORD_SET=YES')
        print('AL_VNC_PASSWORD_ONCE=READY_PRIVATE')
        print('The password is hidden until you explicitly run password-reveal.')
        return 0
    except (OSError, subprocess.SubprocessError, ValueError):
        if os.path.lexists(passfile):
            passfile.unlink()
        print('AL_VNC_PASSWORD_AUTO=DENY_INTERNAL_ERROR')
        return 3


def reveal(oncefile: Path) -> int:
    if not oncefile.is_file() or oncefile.is_symlink() or oncefile.stat().st_mode & 0o077:
        print('AL_VNC_PASSWORD_ONCE=NOT_AVAILABLE_OR_UNSAFE')
        return 2
    password = oncefile.read_text(encoding='ascii').strip()
    if len(password) != 8 or any(c not in CHARS for c in password):
        print('AL_VNC_PASSWORD_ONCE=INVALID')
        return 3
    oncefile.unlink()
    print('VNC_PASSWORD_ONCE_BEGIN')
    print(password)
    print('VNC_PASSWORD_ONCE_END')
    print('Save privately. Never share screenshots containing this password.')
    return 0


def main() -> int:
    if os.geteuid() != 0:
        print('AL_VNC_PASSWORD_AUTO=DENY_ROOT_REQUIRED')
        return 2
    if len(sys.argv) != 2 or sys.argv[1] not in ('setup', 'reveal'):
        print('Usage: python3 al_vnc_password_auto.py setup|reveal')
        return 2
    if sys.argv[1] == 'reveal':
        return reveal(ONE_TIME)
    try:
        account = pwd.getpwnam('albrowser')
    except KeyError:
        print('AL_VNC_PASSWORD_AUTO=DENY_BROWSER_USER_MISSING')
        return 2
    return setup(PASSFILE, ONE_TIME, account.pw_uid, account.pw_gid)


if __name__ == '__main__':
    raise SystemExit(main())
