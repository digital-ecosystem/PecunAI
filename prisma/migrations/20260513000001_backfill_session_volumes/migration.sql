-- Backfill oneTimeVolume from answers where questionOrder = 18.
-- Only touches rows where the column is still NULL (idempotent).
-- The regex guard mirrors the application's Number()/isNaN check so malformed
-- answer strings are left as NULL rather than causing a CAST failure.
UPDATE qa_sessions q
SET "oneTimeVolume" = (
  SELECT
    CASE WHEN a.value ~ '^[0-9]+(\.[0-9]+)?$'
         THEN CAST(a.value AS DECIMAL(10,2))
         ELSE NULL END
  FROM answers a
  JOIN questions qu ON a."questionId" = qu.id
  WHERE a."qaSessionId" = q.id
    AND qu."questionOrder" = 18
  LIMIT 1
)
WHERE q."oneTimeVolume" IS NULL;

-- Backfill recurringVolume from answers where questionOrder = 19.
UPDATE qa_sessions q
SET "recurringVolume" = (
  SELECT
    CASE WHEN a.value ~ '^[0-9]+(\.[0-9]+)?$'
         THEN CAST(a.value AS DECIMAL(10,2))
         ELSE NULL END
  FROM answers a
  JOIN questions qu ON a."questionId" = qu.id
  WHERE a."qaSessionId" = q.id
    AND qu."questionOrder" = 19
  LIMIT 1
)
WHERE q."recurringVolume" IS NULL;
