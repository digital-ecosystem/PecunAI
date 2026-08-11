#!/usr/bin/env bash
#
# audit-missing-documents.sh — which sessions cannot produce their PDFs?
#
# Both the signed contract and the identity-verification (legitimation) PDF are written in
# exactly one moment: the SignTeq webhook. If that moment failed, the file never existed and
# — until the on-demand recovery was added — nothing retried. The failure was logged as a
# warning and container logs do not survive a rebuild, so the only reliable way to find
# affected sessions is to compare the database against the filesystem.
#
# Read-only. Run from the repository root on the VPS:
#
#   bash scripts/audit-missing-documents.sh
#
# A session is "expected to have documents" if it has progressed past DRAFT, which is only
# reachable by completing the signing screen.

set -euo pipefail

DB_SVC=${DB_SVC:-onboarding-db}
APP_SVC=${APP_SVC:-onboarding-app}

echo "Auditing sessions that should have documents…"
echo

ROWS=$(docker compose exec -T "$DB_SVC" sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -F "|"' <<'SQL'
SELECT q.id,
       COALESCE(p."lastName"  || ', ' || p."firstName", '(no personal info)'),
       q.status,
       COALESCE(w."stepData" -> 'signteq' ->> 'status', '-'),
       CASE WHEN h."sessionToken" IS NULL THEN 'no-token' ELSE 'token' END,
       CASE WHEN w."stepData" ? 'legitimationError' THEN 'flagged' ELSE '-' END
FROM qa_sessions q
LEFT JOIN personal_info            p ON p."qaSessionId" = q.id
LEFT JOIN session_workflow_state   w ON w."qaSessionId" = q.id
LEFT JOIN signteq_handshake_info   h ON h."qaSessionId" = q.id
WHERE q.status <> 'DRAFT'
ORDER BY q."createdAt";
SQL
)

# Take the whole filesystem inventory in ONE call.
#
# The previous version ran `docker compose exec` inside the read loop. That command reads
# stdin, so it consumed the rest of the session list being piped into `while read` and the
# audit silently examined exactly one session before stopping — while still printing a
# confident summary. Hence both the single round trip and the row-count assertion below:
# an audit you cannot trust is worse than no audit, because it gets believed.
INVENTORY=$(docker compose exec -T "$APP_SVC" \
  sh -c 'find private-documents -name "*.pdf" 2>/dev/null | grep "/signed/"' \
  < /dev/null || true)

expected=$(printf '%s\n' "$ROWS" | grep -c . || true)

printf '%-38s %-30s %-10s %-26s %-9s %-8s %s\n' \
  SESSION CUSTOMER STATUS SIGNTEQ TOKEN FLAG MISSING
printf '%s\n' "$(printf '─%.0s' {1..170})"

total=0; missing_sig=0; missing_leg=0; missing_both=0

while IFS='|' read -r id customer status signteq token flag; do
  [ -z "$id" ] && continue
  total=$((total + 1))

  gaps=""
  case "$INVENTORY" in
    *"private-documents/$id/signed/signature.pdf"*) ;;
    *) gaps="signature"; missing_sig=$((missing_sig + 1)) ;;
  esac
  case "$INVENTORY" in
    *"private-documents/$id/signed/legitimation.pdf"*) ;;
    *) gaps="${gaps:+$gaps + }legitimation"; missing_leg=$((missing_leg + 1)) ;;
  esac
  [ "$gaps" = "signature + legitimation" ] && missing_both=$((missing_both + 1))

  # Only print rows with a problem — a clean audit should be quiet.
  [ -z "$gaps" ] && continue
  printf '%-38s %-30s %-10s %-26s %-9s %-8s %s\n' \
    "$id" "${customer:0:29}" "$status" "$signteq" "$token" "$flag" "$gaps"
done <<< "$ROWS"

echo
if [ "$total" -ne "$expected" ]; then
  echo "!! INCOMPLETE: the database returned $expected sessions but only $total were checked."
  echo "!! Do not draw conclusions from this run. Something consumed the input stream."
  echo
fi
echo "non-DRAFT sessions checked : $total  (database returned $expected)"
echo "missing signature.pdf      : $missing_sig"
echo "missing legitimation.pdf   : $missing_leg"
echo "missing both               : $missing_both"
cat <<'NOTES'

Reading the result
  TOKEN=token     the signd.id session token is stored, so a missing legitimation can be
                  re-fetched on demand — just open the download URL once and the route
                  fetches and caches it. Whether the token is still valid is a separate
                  question; the route logs the provider's answer either way.
  TOKEN=no-token  nothing to re-fetch with. Recovering that legitimation needs the identity
                  provider, using the stored signatureId.
  FLAG=flagged    the webhook recorded a legitimation download failure for this session.
                  Sessions that failed before that marker existed will not be flagged, which
                  is exactly why this audit compares against the filesystem instead.

A missing signature.pdf with signteq status DOCUMENT_COMPLETED and a stored
advisorDocumentId also self-heals on first download. Missing both, with no token and no
advisorDocumentId, is the only genuinely unrecoverable combination.
NOTES
