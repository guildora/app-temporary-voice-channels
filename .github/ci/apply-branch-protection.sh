#!/usr/bin/env bash
# apply-branch-protection.sh — Configure branch protection for main via gh api
# Idempotent: safe to re-run at any time.
#
# Prerequisites:
#   - gh CLI authenticated with 'repo' and 'workflow' scopes
#   - The 'CI / validate' status check context must already be registered
#     (requires at least one CI run on the repo)
#
# Usage:
#   bash .github/ci/apply-branch-protection.sh [OWNER/REPO]
#
# Default repo: guildora/voice-rooms

set -euo pipefail

REPO="${1:-guildora/voice-rooms}"
BRANCH="main"
EXPECTED_CONTEXT="CI / validate"

echo "=== Branch Protection Setup for ${REPO}:${BRANCH} ==="

# --- Pre-check: gh auth ---
if ! gh auth status 2>/dev/null; then
  echo "::error::gh CLI not authenticated. Run 'gh auth login' with repo,workflow scopes."
  exit 1
fi

# Verify required scopes
SCOPES=$(gh auth status 2>&1 || true)
if ! echo "$SCOPES" | grep -q "repo" || ! echo "$SCOPES" | grep -q "workflow"; then
  echo "::error::gh token missing required scopes (repo, workflow). Current scopes: $(echo "$SCOPES" | grep -o "Token scopes:.*" || echo "unknown")"
  echo "Fix: gh auth login -s repo,workflow"
  exit 1
fi

# --- Pre-check: status check context exists ---
echo "--- Checking if '${EXPECTED_CONTEXT}' context is registered on ${BRANCH}..."
CONTEXT_CHECK=$(gh api "repos/${REPO}/commits/${BRANCH}/check-runs" \
  --jq ".check_runs[].name" 2>/dev/null || true)

if echo "$CONTEXT_CHECK" | grep -qF "validate"; then
  echo "    ✓ Context '${EXPECTED_CONTEXT}' found in check-runs"
else
  echo "    ⚠ Context '${EXPECTED_CONTEXT}' not found in check-runs on ${BRANCH}."
  echo "      This may mean CI hasn't run yet on ${BRANCH}."
  echo "      Available check-run names: $(echo "$CONTEXT_CHECK" | tr '\n' ', ')"
  echo ""
  echo "      Proceeding anyway — GitHub will accept the context in the protection"
  echo "      config even if it hasn't appeared yet, but PRs won't require the check"
  echo "      until the context is registered by a workflow run."
fi

# --- Apply branch protection ---
echo "--- Applying branch protection rules..."

gh api "repos/${REPO}/branches/${BRANCH}/protection" \
  --method PUT \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["CI / validate"]
  },
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false
  },
  "enforce_admins": true,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false
}
EOF

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Branch protection applied successfully."
else
  echo ""
  echo "::error::Failed to apply branch protection. See gh error output above."
  exit 1
fi

# --- Verify ---
echo ""
echo "--- Verifying applied configuration..."
bash "$(dirname "$0")/verify-branch-protection.sh" "$REPO"

echo ""
echo "=== Done ==="
