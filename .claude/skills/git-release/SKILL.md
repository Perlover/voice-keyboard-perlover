---
name: git-release
description: "Git commit and release conventions. Use when committing code, creating releases, bumping versions, pushing to GitHub, or updating changelog. Covers commit messages, versioning, debian/changelog format, and GitHub remote detection."
---

# Git Release Conventions

## When to use this skill

- When creating git commits (any commit, not just releases)
- When user asks to push to GitHub or make a release
- When bumping version numbers
- When updating debian/changelog

## Commit messages

Always write commit messages in **English**, regardless of conversation language.

## Version source of truth

`applet/voice-keyboard@perlover/metadata.json` field `"version"` is the single source of truth.

## Files to update on version bump

1. `applet/voice-keyboard@perlover/metadata.json` — bump `"version"`
2. `debian/changelog` — add new entry at top (Debian format, see below)
3. `Makefile` reads VERSION from metadata.json automatically
4. `settings-schema.json` uses `@@VERSION@@` placeholder (substituted at install/build)

## debian/changelog format

```
voice-keyboard-perlover (X.Y.Z-1) noble; urgency=medium

  * Change description in English

 -- perlover <perlover@perlover.com>  Day, DD Mon YYYY HH:MM:SS +0100
```

## Push to GitHub

When user says "push to GitHub", "release on GitHub", or similar — find the remote pointing to `github.com` and push there:

```bash
# Find GitHub remote name dynamically
git remote -v | grep 'github\.com' | head -1 | awk '{print $1}'
```

Do **NOT** assume `origin` is GitHub. Currently `github` remote points to GitHub, `origin` points to personal server.

## Release workflow

1. Bump patch/minor/major version in `metadata.json`
2. Add entry to `debian/changelog`
3. Stage changed files, commit with English message
4. Create annotated tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z: ..."`
5. Push commit and tag to the GitHub remote
