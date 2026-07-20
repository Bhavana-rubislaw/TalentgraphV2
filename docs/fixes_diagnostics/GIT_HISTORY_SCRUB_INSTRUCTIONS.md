# Git History Scrub — Leaked Credentials

## What's exposed

### 1. Google OAuth client secret

Commit `5c3a3539fbee2af35453abcdd43dcaf9690acc35` ("ui enhancements",
2026-04-14) added `GOOGLE_MEET_TOKEN_ISSUE.md` at the repo root containing a
real Google OAuth client ID and client secret in cleartext:

```
OAuth Client ID: 446306611203-f3ovc5dqp555ebt8sad9c62p6ce5j6is.apps.googleusercontent.com
OAuth Client secret: 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
```

The very next commit, `364af6332d8e983fb4549a9e853f3cff4130690c` (same day),
redacted both values in place — but redacting a later commit does not
remove the earlier blob from history. Anyone with clone access to the repo
can still recover the secret today by running:

```
git show 5c3a353:GOOGLE_MEET_TOKEN_ISSUE.md
```

The file has since moved to `docs/fixes_diagnostics/GOOGLE_MEET_TOKEN_ISSUE.md`
and is redacted in the current `HEAD` — this issue is **only** in history.

### 2. Seed/test admin account password

Commit `e3088912ce37d285f1c20c4917f3990abf3e9919` ("dashboard fixes",
2026-07-14) committed `backend2/.env.example` with a real value for
`SEED_ADMIN_PASSWORD`:

```
SEED_ADMIN_PASSWORD=Kutty_1304
```

This is the login password for the seeded system admin account
(`talentgraph.interviews@gmail.com`), created by
`backend2/scripts/operations/reset_and_reseed.py` and related seed
scripts (see `backend2/app/core/seed_credentials.py`). The very next
commit, `e5daff0506e25066fbcc7122c17ab0f24072c54c` (same day), redacted it
to a dashed placeholder — same pattern as the Google secret above, and
same result: still fully recoverable from history via

```
git show e3088912:backend2/.env.example
```

**I don't know whether this password is still live on any deployed
admin account** — unlike the Google secret, you haven't told me this one
is rotated. If `talentgraph.interviews@gmail.com` still logs in with
`Kutty_1304` anywhere (locally seeded, staging, or production), treat that
as an active exposure: change it via whatever your account-password reset
flow is, or re-run the seed scripts with `SEED_ADMIN_PASSWORD` set to a
new value, before doing anything else in this doc.

## Before you touch history: confirm both credentials are already rotated

You told me on 2026-07-20 that the Google OAuth credential has already
been rotated in Google Cloud Console — but the seed admin password above
is a new finding you haven't confirmed. **Do not proceed with the scrub
below until both are handled**, because:

- Scrubbing history does not retroactively protect a secret that's still
  live — anyone who already cloned the repo, or who has the secret cached
  from a fork/CI log/local reflog, keeps access to it regardless of what
  you do to the canonical history.
- If the credential is still active, rotating it in Google Cloud Console
  (Credentials → OAuth 2.0 Client IDs → reset secret) is the actual fix.
  The history scrub below is defense-in-depth cleanup *after* that, not a
  substitute for it.

## Why I'm not running this myself

Rewriting history is destructive and affects everyone with a clone:

- Every commit from `5c3a353` onward gets a new SHA.
- Anyone with a local clone or fork must re-clone or hard-reset onto the
  rewritten branch — a normal `git pull` will conflict or silently
  diverge.
- Any open PRs based on the old history will need to be re-based or
  re-opened.
- It requires a force-push, which I won't do without your explicit
  go-ahead given how disruptive it is.

So this is written as a runbook for you (or whoever has push rights) to
execute when ready, not something I've applied.

## Option A — `git filter-repo` (recommended)

`git filter-repo` is the tool GitHub itself recommends over the older
`filter-branch`/BFG combo; it's faster and less error-prone.

```bash
# 1. Install (one-time)
pip install git-filter-repo
# or: brew install git-filter-repo

# 2. Make a fresh, disposable clone — never run filter-repo on your only
#    working copy.
git clone https://github.com/Bhavana-rubislaw/TalentgraphV2.git talentgraphv2-scrub
cd talentgraphv2-scrub

# 3. Strip the secret string from every version of the file across all
#    history (matches the exact leaked value, not just the current path,
#    since the file was later renamed).
cat > /tmp/replacements.txt <<'EOF'
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==>[REDACTED-ROTATED]
446306611203-f3ovc5dqp555ebt8sad9c62p6ce5j6is.apps.googleusercontent.com==>[REDACTED-ROTATED]
SEED_ADMIN_PASSWORD=Kutty_1304==>SEED_ADMIN_PASSWORD=[REDACTED-ROTATED]
EOF

git filter-repo --replace-text /tmp/replacements.txt

# 4. Verify both secrets are gone from every commit, not just HEAD
git log --all -p -S"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" | wc -l   # expect 0
git log --all -p -S"Kutty_1304" | wc -l                            # expect 0

# 5. Re-add the remote (filter-repo removes it as a safety measure) and
#    force-push every affected branch
git remote add origin https://github.com/Bhavana-rubislaw/TalentgraphV2.git
git push origin --force --all
git push origin --force --tags
```

## Option B — BFG Repo-Cleaner (simpler CLI, same effect)

```bash
# 1. Download BFG (requires Java)
#    https://rtyley.github.io/bfg-repo-cleaner/

# 2. Fresh mirror clone (BFG requires --mirror, not a normal clone)
git clone --mirror https://github.com/Bhavana-rubislaw/TalentgraphV2.git talentgraphv2-scrub.git
cd talentgraphv2-scrub.git

# 3. Strip the secrets
echo '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' > /tmp/secrets.txt
echo '446306611203-f3ovc5dqp555ebt8sad9c62p6ce5j6is.apps.googleusercontent.com' >> /tmp/secrets.txt
echo 'Kutty_1304' >> /tmp/secrets.txt
java -jar bfg.jar --replace-text /tmp/secrets.txt

# 4. Clean up refs and force-push
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

## After either option — required follow-up

1. **Tell every collaborator to re-clone** rather than pull. A `git pull`
   against rewritten history will create a confusing merge of old and new
   SHAs.
2. **Close and re-open any open PRs** based on commits at or after
   `5c3a353` — their diffs will otherwise reference now-nonexistent SHAs.
3. **Check GitHub's cached views**: GitHub may keep the old blob
   reachable via cached PR diffs, forks, or the "network graph" for a
   period after the rewrite. If the credential is not yet rotated,
   contact GitHub Support to request cache purging of the exposed blob —
   this is the one step that genuinely can't be done from the CLI.
4. **Re-run the CI pipeline once** after the force-push to confirm nothing
   downstream (deploy keys, webhook configs pinned to a commit SHA, etc.)
   broke from the rewritten history.

## Longer-term prevention

Since this leak happened via a diagnostic markdown file rather than a
`.env` or config file, a `.gitignore` rule wouldn't have caught it. Two
options worth considering, at your discretion (not applied here):

- Add a pre-commit secret scanner (e.g. `gitleaks` or GitHub's built-in
  secret scanning / push protection, if available on your plan) so a
  commit containing a string matching `GOCSPX-…` or similar credential
  patterns is rejected before it ever reaches history.
- When writing incident/diagnostic docs like `GOOGLE_MEET_TOKEN_ISSUE.md`,
  redact credential values at authoring time rather than relying on a
  follow-up commit — the follow-up commit is exactly what happened here,
  and it wasn't enough.
