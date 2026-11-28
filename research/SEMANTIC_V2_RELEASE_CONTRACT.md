# Semantic v2 candidate: release contract

This document is a release checklist, not evidence of release or a deployment
authorization. The default branch and public host remain unchanged.

## Candidate scope

- One optional, content-addressed same-origin model bundle; verify exact decoded
  length, SHA-256, schema and Worker activation before persistence.
- Local search and catalog-grounded ranking; no transmission of search text for
  model inference. The ordinary search remains usable without the model.
- 40 localized interface/intent packs, 64 intent classes, reviewed exact variants,
  bounded unique adjacent-letter corrections in allowlisted operation words.
- Nine task classes have bounded full-query grammars across eight languages
  (not every class in every language). The grammar must match the entire query.
- Optional single-edit spelling suggestions for reviewed English operation verbs
  only: no semantic or ordinary catalog result, unique correction, existing
  catalog evidence, explicit user selection, no automatic URL navigation.
  All 40 interface packs carry a suggestion prompt; that is not 40-language
  spelling correction. Suggestions do not alter the query until selected.
- Unrestricted typo correction, open intent classification and open semantic
  suggestion lists remain research-only. Never describe them as shipped.
- Freeze the candidate feature scope after these bounded features pass. Further
  grammar coverage is not a release prerequisite unless a verified regression
  or actual user need justifies it. Independent evidence remains mandatory for
  any future expansion of automatic classification.

## Before any production upload

For the same candidate HEAD, obtain successful feature checks, Chromium smoke,
Firefox research checks, and full verify workflow. Read the actual job logs,
including the generated mixed-language, colloquial, correction, constraint,
actual catalog relevance, suggestion and browser metrics reports. Require actual
Worker suggestion counters and the real 390x844 directory interaction metrics;
verify reversible input edits, IME suppression and localized prompts. A canceled or failed run is not a complete success.

Run these checks from the repository root (no server credentials needed):

```sh
node scripts/build_semantic_candidate.cjs --check
python3 -m unittest discover -s tests -p test_semantic_host.py -v
node scripts/research_atlas_retrieval_v2.cjs
python3 tests/browser_research_semantic_worker.py
python3 tests/browser_research_semantic_directory.py --packaged
python3 tests/browser_research_semantic_worker.py --firefox
python3 tests/browser_research_semantic_directory.py --packaged --firefox
```

Generate the staging directory outside the repository. For example, with a
fresh temporary parent directory:

```sh
stage_parent=$(mktemp -d)
node scripts/build_semantic_candidate.cjs "$stage_parent/site"
python3 scripts/audit_semantic_candidate.py "$stage_parent/site" > "$stage_parent/candidate-manifest.json"
```

Keep the manifest outside the public web root. The audit is read-only and does
not connect to the host. Record its revision,
complete file manifest, full model digest and decoded byte count. Compare two
independent builds. Keep the immutable model digest separate from runtime
revision and record the full staged site file manifest. Confirm the model is absent from shell precache and the
legacy downloader is absent from the staged directory. Check deployed file
allowlist and dependency-first transfer order. Do not upload research fixtures,
test sources, credentials, or private host paths.

The normal FTPS workflow still reads the repository's `site/` directory; the
external staged candidate is not selected by that workflow. Before release,
review an explicitly authorized candidate promotion procedure that uses the
exact audited staged tree and verifies the manifest, without changing the
ordinary default-branch deployment silently. A green candidate build alone
does not authorize or accomplish that promotion.

Do not merge, upload or activate the candidate unless the user has authorized
release after review. Desktop browser evidence does not establish Android or
public-host compatibility. Real-host model validation is necessarily a separate
post-upload check; if a preview host is unavailable, record that limitation.

## After separately authorized upload

First verify the immutable public model asset using
`python3 scripts/check_semantic_host.py`. It must return HTTP 200, approved
MIME, exact decoded size and matching full SHA-256; a challenge page, redirect,
truncated body or invalid compression fails. Do not bypass host challenges.

Then verify the actual public directory from an Android browser: model consent,
download, progress, activation, ordinary-search fallback, reload without a
second model transfer, deletion, re-enable and multilingual search. Record
browser version and the actual diagnostic code, without recording query text,
credentials or private user identifiers.

If a gate fails, stop rollout and preserve or restore the last verified
working website. The existing FTPS transfer procedure is not globally atomic;
do not claim automatic rollback for every file unless demonstrated. Never
delete a previous content-addressed model still required by an older client.

## Research quality gates

Keep authored/generated examples distinct from independent query evidence.
Report acceptance precision, correct positive coverage, false acceptance rate,
and catalog relevance separately. Zero errors on a small authored set does not
prove zero real-world errors. Do not relax constraints merely to improve coverage.

For open classification, open semantic suggestions or unrestricted typo correction, require a
new representative evaluation set not used for tuning, including unsupported
actions, ambiguous queries and mixed-language constraints. Proposed minimum:
at least 95% accepted precision, at most 1% negative false acceptance, at least
70% correct positive coverage, and no tested constraint leaks. Inspect sample
counts, per-language error distributions, and uncertainty before approval.
These proposed thresholds are not evidence that the gate has been met.
