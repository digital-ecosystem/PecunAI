-- One-off recovery for the two advisor signatures stranded by the SignTeq webhook outage
-- of 2026-07-30 → 2026-08-04. Safe to re-run: it is idempotent.
--
-- Christian Leski signed both contracts on 2026-08-04 and SignTeq holds the completed documents,
-- but no `document_completed` webhook was ever delivered (the webhook was configured on the wrong
-- work area — Finova PROD instead of Finova TEST digital-ecosystem), so `stepData.signteq.status`
-- was never advanced and the advisor dashboard still reports the contracts as unsigned.
--
-- Both request ids come from the container logs; both document ids and `completed_at` values were
-- read back from SignTeq itself via GET /v1/requests/{id} before this file was written:
--
--   f70b589b… Lechner Thomas    request a7574b51…  document b306a0fa…  completed 16:57:43
--   63fc5dbf… Rechberger Tobias request 2fef8f44…  document 92f63dec…  completed 16:57:21
--
-- Run it from the repository root on the VPS:
--
--   docker compose exec -T onboarding-db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' \
--     < scripts/recover-advisor-signatures-2026-08-04.sql
--
-- The signed PDFs are NOT restored to disk here — the download route re-fetches them from SignTeq
-- on demand using advisorDocumentId, so setting the pointer is enough. That requires the code from
-- the same commit to be deployed. See
-- private-documents/after-demo/ADVISOR_SIGNATURE_COMPLETION_FIX_PLAN.md.

BEGIN;

DO $$
DECLARE
  n int;
-- Two guards against the failure mode that matters: an UPDATE that loses its WHERE clause and
-- rewrites all 85 rows. Each statement asserts it touched exactly one row, and the CASE means any
-- row that is not the intended one would be set to its own existing value regardless. Either
-- assertion failing aborts the transaction, so nothing is committed.
BEGIN
  -- Lechner Thomas
  UPDATE session_workflow_state
  SET "stepData" = CASE
        WHEN "qaSessionId" = 'f70b589b-c4ea-4c57-a8b0-322839df35ba'
        THEN jsonb_set("stepData", '{signteq}',
               COALESCE("stepData" -> 'signteq', '{}'::jsonb) || '{
                 "advisorRequestId":  "a7574b51-f4d0-421d-8a54-55bd14bbacdd",
                 "advisorDocumentId": "b306a0fa-ceba-472a-8353-27ed6f7a6fc9",
                 "status":            "DOCUMENT_COMPLETED",
                 "completedAt":       "2026-08-04T16:57:43+02:00",
                 "completedVia":      "manual_recovery"
               }'::jsonb)
        ELSE "stepData"
      END
  WHERE "qaSessionId" = 'f70b589b-c4ea-4c57-a8b0-322839df35ba';

  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN
    RAISE EXCEPTION 'Lechner (f70b589b…): expected exactly 1 row, updated %', n;
  END IF;

  -- Rechberger Tobias
  UPDATE session_workflow_state
  SET "stepData" = CASE
        WHEN "qaSessionId" = '63fc5dbf-17de-4710-98ab-42153358dece'
        THEN jsonb_set("stepData", '{signteq}',
               COALESCE("stepData" -> 'signteq', '{}'::jsonb) || '{
                 "advisorRequestId":  "2fef8f44-44fb-446c-b9ab-62762b8ae4ee",
                 "advisorDocumentId": "92f63dec-412c-4f87-abbf-72daaed8dacb",
                 "status":            "DOCUMENT_COMPLETED",
                 "completedAt":       "2026-08-04T16:57:21+02:00",
                 "completedVia":      "manual_recovery"
               }'::jsonb)
        ELSE "stepData"
      END
  WHERE "qaSessionId" = '63fc5dbf-17de-4710-98ab-42153358dece';

  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN
    RAISE EXCEPTION 'Rechberger (63fc5dbf…): expected exactly 1 row, updated %', n;
  END IF;

  RAISE NOTICE 'Both sessions updated.';
END $$;

-- Must print exactly the two sessions, both DOCUMENT_COMPLETED, with DIFFERENT advisor documents.
-- Identical advisor_doc values would mean the ids were crossed — roll back rather than commit.
SELECT "qaSessionId",
       "stepData" -> 'signteq' ->> 'status'            AS status,
       "stepData" -> 'signteq' ->> 'advisorDocumentId' AS advisor_doc,
       "stepData" -> 'signteq' ->> 'documentId'        AS customer_doc
FROM session_workflow_state
WHERE "stepData" -> 'signteq' ->> 'completedVia' = 'manual_recovery'
ORDER BY "qaSessionId";

COMMIT;
