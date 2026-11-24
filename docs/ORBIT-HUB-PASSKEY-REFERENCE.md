# AVENQIR WebAuthn reference for Orbit Hub

Scope: owner adm only. Pinned Report URI library 1b738bdb6df0b34604131ba43846a20c69cce8d7; MIT attribution in site/webauthn. The PHP adapter is not a direct drop-in for Cloudflare Workers: later Orbit Hub implementation should use a maintained JS verifier, its own RP ID and origin and atomic credential/counter persistence. Do not share credentials, cookie or identity between the two projects.

Flow: owner password + fresh TOTP -> register options -> device create -> validate clientData, exact origin, RP ID hash, UP+UV, credential ID, attestation/COSE -> store public key; sign-in uses one-use 120s challenge and explicit credential allow list -> verify owner handle when provided, signature and monotonic counter -> regenerate shared session. Password or MFA revision changes invalidate stored grants. Revoke-all requires fresh TOTP. Password recovery path remains enabled. No biometric data, private key or shared authentication token is exported.

Verification: synthetic real P-256 registration and assertion tests, negative origin/challenge/ID/handle/signature/UV/counter cases. Real mobile enrollment/sign-in, server PHP extensions, browser compatibility and fixed-cert Android WebView still require physical acceptance. Do not reuse AVENQIR RP ID for Orbit Hub. No Orbit Hub Actions run is requested in this project.
