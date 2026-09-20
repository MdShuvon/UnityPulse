-- migrations/03_money_to_paisa.sql
-- Fixes issue #7. Run this in its own deploy, with a database backup taken first.
--
-- Payment.amount is already Int paisa and is NOT touched.
--
-- Why this matters: DonationProject.collectedAmount accumulates Float additions.
-- Binary floating point cannot represent 0.10 exactly, so a public-facing total
-- drifts. On a donation platform that number is the one people check.
--
-- ORDER OF OPERATIONS:
--   1. Take a backup.
--   2. Stop the API (writes during this migration would be lost).
--   3. Run this file.
--   4. Update schema.prisma (Float -> Int) and run `npx prisma db push`.
--   5. Deploy the code that uses toPaisa()/fromPaisa() from lib/money.ts.

BEGIN;

ALTER TABLE "DonationProject"
  ALTER COLUMN "goalAmount"      TYPE INTEGER USING round("goalAmount"      * 100)::int,
  ALTER COLUMN "collectedAmount" TYPE INTEGER USING round("collectedAmount" * 100)::int,
  ALTER COLUMN "collectedAmount" SET DEFAULT 0;

ALTER TABLE "Donation"
  ALTER COLUMN "amount" TYPE INTEGER USING round("amount" * 100)::int;

ALTER TABLE "ProjectExpense"
  ALTER COLUMN "amount" TYPE INTEGER USING round("amount" * 100)::int;

ALTER TABLE "JobPost"
  ALTER COLUMN "applicationFee" TYPE INTEGER USING round("applicationFee" * 100)::int,
  ALTER COLUMN "applicationFee" SET DEFAULT 0;

ALTER TABLE "Organization"
  ALTER COLUMN "bankBalance" TYPE BIGINT USING round("bankBalance" * 100)::bigint,
  ALTER COLUMN "bankBalance" SET DEFAULT 0;

-- Money can never be negative in this domain.
ALTER TABLE "Donation"        ADD CONSTRAINT "donation_amount_positive"  CHECK ("amount" > 0);
ALTER TABLE "ProjectExpense"  ADD CONSTRAINT "expense_amount_positive"   CHECK ("amount" > 0);
ALTER TABLE "DonationProject" ADD CONSTRAINT "goal_amount_positive"      CHECK ("goalAmount" > 0);
ALTER TABLE "DonationProject" ADD CONSTRAINT "collected_non_negative"    CHECK ("collectedAmount" >= 0);
ALTER TABLE "JobPost"         ADD CONSTRAINT "fee_non_negative"          CHECK ("applicationFee" >= 0);

COMMIT;

-- Sanity check afterwards — collectedAmount must equal the sum of its donations.
-- SELECT p.id, p."collectedAmount", COALESCE(SUM(d.amount), 0) AS actual
-- FROM "DonationProject" p
-- LEFT JOIN "Donation" d ON d."projectId" = p.id AND d.status = 'VERIFIED'
-- GROUP BY p.id, p."collectedAmount"
-- HAVING p."collectedAmount" <> COALESCE(SUM(d.amount), 0);