#!/usr/bin/env bash
# verify-branch-protection.sh — Verify branch protection config matches expected values
# Exits 0 if all checks pass, exits 1 with a diagnostic message for each mismatch.
#
# Usage:
#   bash .github/ci/verify-branch-protection.sh [OWNER/REPO]
#
# Default repo: guildora/voice-rooms

set -euo pipefail

REPO="${1:-guildora/voice-rooms}"
BRANCH="main"
ERRORS=0

echo "=== Verifying Branch Protection for ${REPO}:${BRANCH} ==="

# --- Fetch protection config ---
echo "--- Fetching protection config..."
PROTECTION=$(gh api "repos/${REPO}/branches/${BRANCH}/protection" 2>/dev/null) || {
  echo "::error::Failed to fetch branch protection. Branch may not be protected."
  echo "  HTTP response: $PROTECTION"
  exit 1
}

# --- Helper: assert field value ---
assert_field() {
  local label="$1"
  local actual="$2"
  local expected="$3"

  if [ "$actual" = "$expected" ]; then
    echo "  ✓ ${label}: ${actual}"
  else
    echo "  ✗ ${label}: expected '${expected}', got '${actual}'"
    ERRORS=$((ERRORS + 1))
  fi
}

# --- Helper: assert array contains element ---
assert_array_contains() {
  local label="$1"
  local array_json="$2"
  local expected_element="$3"

  if echo "$array_json" | grep -qF "\"${expected_element}\""; then
    echo "  ✓ ${label}: contains '${expected_element}'"
  else
    echo "  ✗ ${label}: missing '${expected_element}' — array is: ${array_json}"
    ERRORS=$((ERRORS + 1))
  fi
}

# --- Check: required_status_checks ---
echo ""
echo "[required_status_checks]"

RSC_ENABLED=$(echo "$PROTECTION" | jq -r '.required_status_checks != null')
if [ "$RSC_ENABLED" = "true" ]; then
  assert_field "strict" \
    "$(echo "$PROTECTION" | jq -r '.required_status_checks.strict')" \
    "true"

  CONTEXTS=$(echo "$PROTECTION" | jq -r '.required_status_checks.contexts')
  assert_array_contains "contexts includes 'CI / validate'" \
    "$CONTEXTS" \
    "CI / validate"
else
  echo "  ✗ required_status_checks: null (not configured)"
  ERRORS=$((ERRORS + 1))
fi

# --- Check: required_pull_request_reviews ---
echo ""
echo "[required_pull_request_reviews]"

RPR_ENABLED=$(echo "$PROTECTION" | jq -r '.required_pull_request_reviews != null')
if [ "$RPR_ENABLED" = "true" ]; then
  assert_field "required_approving_review_count" \
    "$(echo "$PROTECTION" | jq -r '.required_pull_request_reviews.required_approving_review_count')" \
    "1"

  assert_field "dismiss_stale_reviews" \
    "$(echo "$PROTECTION" | jq -r '.required_pull_request_reviews.dismiss_stale_reviews')" \
    "true"

  assert_field "require_code_owner_reviews" \
    "$(echo "$PROTECTION" | jq -r '.required_pull_request_reviews.require_code_owner_reviews')" \
    "false"
else
  echo "  ✗ required_pull_request_reviews: null (not configured)"
  ERRORS=$((ERRORS + 1))
fi

# --- Check: enforce_admins ---
echo ""
echo "[enforce_admins]"
assert_field "enforce_admins" \
  "$(echo "$PROTECTION" | jq -r '.enforce_admins.enabled')" \
  "true"

# --- Check: restrictions ---
echo ""
echo "[restrictions]"
assert_field "restrictions" \
  "$(echo "$PROTECTION" | jq -r '.restrictions')" \
  "null"

# --- Check: allow_force_pushes ---
echo ""
echo "[allow_force_pushes]"
assert_field "allow_force_pushes" \
  "$(echo "$PROTECTION" | jq -r '.allow_force_pushes.enabled')" \
  "false"

# --- Check: allow_deletions ---
echo ""
echo "[allow_deletions]"
assert_field "allow_deletions" \
  "$(echo "$PROTECTION" | jq -r '.allow_deletions.enabled')" \
  "false"

# --- Check: block_creations ---
echo ""
echo "[block_creations]"
assert_field "block_creations" \
  "$(echo "$PROTECTION" | jq -r '.block_creations.enabled')" \
  "false"

# --- Summary ---
echo ""
if [ "$ERRORS" -eq 0 ]; then
  echo "✅ All ${ERRORS} checks passed — branch protection is correctly configured."
  exit 0
else
  echo "❌ ${ERRORS} check(s) failed — branch protection does not match expected configuration."
  exit 1
fi
