---
name: git-release
description: "PROACTIVE: Commit, versioning and release procedure for the voice-keyboard@perlover repo. Use when committing any change here (messages must be English), bumping the version in applet/voice-keyboard@perlover/metadata.json, writing a debian/changelog entry, creating or pushing a vX.Y.Z tag, pushing to the github or origin remote, or checking the Build DEB workflow and GitHub Release (.github/workflows/deb.yml). Covers the Release vX.Y.Z subject form, patch vs minor choice, which files a release commit touches, the changelog trailer and date, pre-release version/build checks, annotated tags, and pitfalls from past releases. Russian triggers: коммит, закоммить, релиз, выпусти версию, подними версию, changelog, тег, запушь на GitHub, пуш, сборка deb."
---

# Commits and releases: voice-keyboard@perlover

The list of version files is in CLAUDE.md under "Version Updates". This skill adds the procedure, the
exact formats and the mistakes past releases made. Commit only when the user asks. A `v*` tag pushed
to `github` publishes a GitHub Release, so bump, tag and push tags only on an explicit release request.

## Commit messages

- **English, always.** This overrides the global `auto-commit` skill, which writes Russian messages.
  If both skills load, follow auto-commit's staging and push-to-upstream (`origin`) steps, but write
  the message in English. Four early commits are in Russian (`274e583`, `9fda264`, `902c589`,
  `b454c90`); they predate this rule, so don't copy them.
- Subject: imperative and capitalized, with no trailing period and no `feat:`/`fix:` prefix; history
  stays under ~75 characters. Examples: `Fix ffmpeg subprocess pipe deadlock causing empty recordings`,
  `Remove debhelper-build-stamp from git tracking`.
- Release subject: exactly `Release vX.Y.Z: <summary>`. Commit `fa97aa5` used
  `Add export/import settings feature v1.8.0` instead, so `git log --grep='^Release v'` misses v1.8.0.
- Body: a blank line, then prose or `- ` bullets wrapped at about 72 columns. Say what changed for the
  user and why. For a fix, give the root cause (`2ea39b9` explains the argparse change in Cinnamon
  6.6, `01e030c` the 64KB pipe buffer). If you added strings, say how many and for which languages.
  End with the attribution trailer from the session's instructions. Don't hardcode a model name,
  because past commits name several.
- Stage files by name. Never stage:
  - `.claude/plans/*`: `5fc6af0` committed `jolly-zooming-kite.md` by accident.
  - debian build outputs (`debian/.debhelper/`, `debian/files`, `*.substvars`,
    `debian/voice-keyboard-perlover/`). They are gitignored. `debhelper-build-stamp` stayed tracked
    until `7c9fb6d` removed it.
  - After `make deb`, `git status --short` must list only the files you meant to change.

## Versioning

- Version strings: `metadata.json` holds `X.Y.Z`, the Debian version is `X.Y.Z-1` (the revision is
  always `-1`) and the tag is `vX.Y.Z`.
- **Minor** (`Y+1`, `Z=0`): a new feature or mode, or a noticeable behavior change. Examples: 1.6.0
  switched to OGG/Opus, 1.8.0 added export/import, 1.9.0 added the retry dialog, 1.10.0 added the
  OpenAI-compatible mode.
- **Patch**: a bug fix or a change to the model list. Examples: 1.7.2 through 1.7.6, 1.8.1, 1.9.1.
- Each part is a plain number: 1.9.1 was followed by 1.10.0, not 2.0.
- Get the current version from `metadata.json` or from `git tag --sort=-v:refname | head -1`. A plain
  `git tag` sorts `v1.10.0` between `v1.1.0` and `v1.2.0`.
- Every version gets its own changelog entry and its own tag, even when releases are minutes apart
  (1.7.2 through 1.7.6 shipped the same evening).

## What a release commit touches

| File | When |
|------|------|
| `applet/voice-keyboard@perlover/metadata.json` `version` | always |
| `debian/changelog`: a new entry at the top | always |
| `metadata.json` `cinnamon-version` | when a new Cinnamon version is supported (1.9.1 added `"6.6"`) |
| `metadata.json` `description` and the `debian/control` `Description` | when the backends or feature set change (1.10.0) |
| `debian/control` `Build-Depends` | when the build needs a new tool (1.7.0 added `gettext`). Also add it to the `apt-get install` line in `deb.yml`; `gettext` is missing there and CI works only because the runner image ships it. |
| `po/voice-keyboard@perlover.pot` and all 6 `po/*.po` | when the release adds any user-visible string, including `settings-schema.json` labels and descriptions. `16682c8` added strings that 1.8.0 had missed. |
| `CLAUDE.md` | when an exit code, env var, audio format or architecture rule changes (1.7.0, 1.10.0). 1.6.0 (OGG/Opus) and 1.9.0 (exit code 7) skipped this, and CLAUDE.md stayed wrong until 2026-10-16. |
| `README.md`, tests | when user-visible setup or behavior changes (1.10.0). README has no changelog or version section. |

Leave these alone:
- **`Makefile`**: it has read VERSION from `metadata.json` since 1.7.0. Before that, VERSION was
  hardcoded and bumped in every release. Don't bring that back.
- **The version label in `settings-schema.json`**: it stays as `@@VERSION@@`. Both `make install`
  and `debian/rules` (`override_dh_auto_install`) replace it.
- **`Project-Id-Version` in po headers, `last-edited` in `metadata.json`**: not updated per release.

Code change and bump usually share one `Release vX.Y.Z:` commit (the norm since 1.7.0); a fix
commit followed by a bump-only release commit is also fine (`01e030c` then `9017f6a`).

## debian/changelog entry

```
voice-keyboard-perlover (X.Y.Z-1) noble; urgency=medium

  * User-facing change, capitalized, no trailing period
  * A long bullet wraps at about 76 columns, with continuation lines
    indented four spaces
  * i18n: new strings translated to 6 languages (ru, es, de, fr, zh, ja)

 -- perlover <perlover@perlover.com>  Fri, 16 Oct 2026 16:50:00 +0200

```

- Add the new entry at the top and leave one blank line before the previous entry. **Never rename an
  entry once it has been committed as a release.** `26d985d` changed the 1.5.2 header to 1.5.3 and
  `8d3e7c0` changed 1.3.2 to 1.3.3 (already tagged); both versions now have no changelog entry.
- Distribution is always `noble` and urgency is always `medium`.
- The trailer line has this shape: a space, `--`, a space, `perlover <perlover@perlover.com>`, **two**
  spaces, then the date. The maintainer name is lowercase, as in the `debian/control` `Maintainer`
  field. The git author is `Perlover`, so don't copy the name from `git log`.
- **Generate the date with `date -R`.** It always prints English names and the machine's real UTC
  offset. Don't type the date by hand, and don't use `date +'%a, %d %b ...'`: this user's locale is
  Russian and it prints `Пт, 16 окт`. Hand-typed dates went wrong in 20 of 26 trailers checked on
  2026-10-16 (weekday not matching the date, or 2024 for releases made in 2025), and
  `dpkg-parsechangelog` reports neither problem.

## Pre-release checks (run from the repo root)

```bash
meta=$(python3 -c "import json;print(json.load(open('applet/voice-keyboard@perlover/metadata.json'))['version'])")
[ "$(dpkg-parsechangelog -S Version)" = "$meta-1" ] || echo "VERSION MISMATCH: meta=$meta"
git rev-parse -q --verify "refs/tags/v$meta" && echo "TAG v$meta ALREADY EXISTS"
./tests/run-all-tests.sh
make deb && ls -l "../voice-keyboard-perlover_${meta}-1_all.deb"
git status --short
```

- **Why the versions must match:**
  - `dpkg-buildpackage` names the `.deb` after the `debian/changelog` version.
  - `make deb-install` looks for `../voice-keyboard-perlover_$(VERSION)-1_all.deb`, where VERSION
    comes from `metadata.json`. A mismatch fails with `ERROR: Package file not found!`.
  - The GitHub Release asset carries the changelog version: the `v1.0.1` release ships
    `voice-keyboard-perlover_1.0.0-1_all.deb`.
- **The local test run is the only test gate.** CI runs no tests: `deb.yml` only runs `make deb`, and
  `override_dh_auto_test` in `debian/rules` does nothing. `make deb` does run `msgfmt -c` on every
  `.po`, so a broken translation fails the build.
- **Known test failure** (as of 2026-10-16): outside a Cinnamon session, `state-machine-tests.js`
  fails with `ImportError: No JS module 'ui' found in search path`. The other 5 suites pass. A new
  failure in any of them blocks the release.
- `make deb` writes `_all.deb` plus `_amd64.buildinfo`/`.changes` to `../`, outside the repo;
  `make deb-clean` removes only `_all.*` names, so the `_amd64` files pile up there.

## Tag

- Use an annotated tag:
  `git tag -a vX.Y.Z -m "Release vX.Y.Z: <same summary as the commit subject>"`. A body of bullets is
  optional (the v1.9.0 and v1.6.0 tags have one).
- Ten old tags are lightweight, among them v1.6.1, v1.7.0, v1.7.1 and v1.8.0. Don't add more:
  `git push --follow-tags` skips lightweight tags.
- Create the tag right after the release commit. Tags created later ended up on follow-up commits:
  `v1.7.0` → `207f3a1`, `v1.8.0` → `16682c8`, `v1.5.3` → `e38abbd`. As a result, the v1.7.0 tag
  contains changes that the changelog lists under 1.7.1, and v1.5.2 was never tagged.
- Never move or delete a pushed tag: its push to `github` already ran the release job and published
  a `.deb` under that name. Ship a new patch release instead.
- To verify: `git show vX.Y.Z:applet/voice-keyboard@perlover/metadata.json | grep '"version"'`.

## Push

There are two remotes. `origin` is `git.perlover.com`, the personal server, and `master` tracks it.
`github` is GitHub, where CI runs. Find the GitHub remote by its URL rather than assuming a name:
`git remote -v | grep 'github\.com' | head -1 | awk '{print $1}'`.

- If the user says "push to GitHub", push to `github` only.
- For a full release, push the branch **and** the tag by name to both remotes:

  ```bash
  git push origin master && git push origin vX.Y.Z
  git push github master && git push github vX.Y.Z
  ```

- `git push <remote> master` doesn't send tags (as of 2026-10-16 `origin` lacks `v1.9.1`, `v1.10.0`).
  Never force-push.

## CI and GitHub Release (`.github/workflows/deb.yml`)

- The workflow runs on pushes to `master`, pushes of `v*` tags and pull requests. Each run builds with
  `make deb` on ubuntu-24.04 and uploads the `.deb` as the artifact `voice-keyboard-perlover-deb`.
- Only a tag push creates a GitHub Release, through `softprops/action-gh-release@v2`. The release is
  named after the tag, has an empty body, and carries the asset `voice-keyboard-perlover_X.Y.Z-1_all.deb`.
  A release therefore triggers two runs (the master push and the tag push), each taking 1–2 minutes.
- If you edit the workflow, keep `permissions: contents: write` (`d9da685`). Without it the `v1.0.0`
  tag run failed with `Resource not accessible by integration` when creating the release. Also keep
  the step that copies `../voice-keyboard-perlover_*.deb` into `artifacts/` (`719120c`), which
  replaced direct `../` globs in the upload steps.
- To check: `gh run list -R Perlover/voice-keyboard-perlover -L 4` works without login; for the asset,
  `curl -s https://api.github.com/repos/Perlover/voice-keyboard-perlover/releases/latest`
  (`gh release list` returns 401 until `gh auth login`). Check the release itself, not just a green
  run: as of 2026-10-16 only 15 of 25 tags have a Release (none for v1.7.0–v1.7.5).

## Release checklist

1. Confirm that the user asked for a release, then choose patch or minor.
2. Bump `version` in `metadata.json`, plus `cinnamon-version` and `description` if they apply.
3. Add the `debian/changelog` entry at the top, with the date from `date -R`.
4. Update the translation files, CLAUDE.md, README and `debian/control` if the table above says so.
5. Run the pre-release checks and fix everything they report.
6. Stage files by name and commit with `Release vX.Y.Z: <summary>`.
7. Create the annotated tag `vX.Y.Z` on that commit.
8. Push the branch and the tag to the remotes the user asked for.
9. Check the CI runs and confirm the `.deb` is attached to the GitHub Release.
