# Passkey host delivery blocker — 2026-11-24

Observed CI: https://github.com/initial2024/avenqir-site/actions/runs/45382588949
Direct DAL probe: DENY / HOST_BROWSER_CHALLENGE.
Orbit unsigned preflight: https://github.com/initial2024/orbit-admin-android/actions/runs/45379179161

## Hosting support request (not sent)

Hello, our Android app uses standard Android Credential Manager passkeys with the existing website origin https://avenqir.bg5.net. The public endpoint https://avenqir.bg5.net/.well-known/assetlinks.json returns an HTML browser challenge to a noninteractive HTTPS client instead of its JSON document. Can you officially support direct public HTTP 200 application/json delivery of this exact static path, without cookies, JavaScript, authentication or redirects? All other site protections should remain enabled. If this is not supported on the current hosting plan, please confirm the supported hosting options and whether the existing hostname can be retained.

## Acceptance

1. Hosting provider confirms supported configuration, or an authorized migration plan retains the original RP ID where possible. Do not change DNS, RP ID, server verification or signing keys merely to suppress the error.
2. Run python3 scripts/audit_v116_public_evidence.py --dal from clean CI. Direct 200 JSON, exact expected package and signing certificate association must pass; no redirect, challenge execution or cookies.
3. Confirm installed app signer matches the protected original release certificate, using the existing release-signing readiness workflow. Never print private keys or passwords.
4. On vivo, test real registration and assertion using Android Credential Manager with user verification and server-side challenge/signature checks. Confirm password and 2FA recovery remain usable.
5. Only publish an original-signed APK after required CI, release signing and upgrade verification; unsigned build success is not release acceptance.

If a new RP ID is unavoidable, design an explicitly authorized re-enrollment and account-recovery migration first. Existing passkeys must not be assumed transferable. No automatic session transfer, no weakened authentication.
