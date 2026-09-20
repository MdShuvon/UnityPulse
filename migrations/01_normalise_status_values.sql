-- migrations/01_normalise_status_values.sql
-- Fixes issue #4, STEP 1 of 3.
--
-- Run this BEFORE switching schema.prisma from String to enum. Prisma cannot
-- cast a column to an enum if any existing row holds a value outside the enum.
--
-- Run inside a transaction and inspect the counts before committing.

BEGIN;

-- ── Inspect first. Run these SELECTs, confirm the numbers, then continue. ──
-- SELECT status, COUNT(*) FROM "TaskSubmission"        GROUP BY status;
-- SELECT status, COUNT(*) FROM "JobApplication"        GROUP BY status;
-- SELECT status, COUNT(*) FROM "OrgMembership"         GROUP BY status;
-- SELECT status, COUNT(*) FROM "CauseJoinRequest"      GROUP BY status;
-- SELECT status, COUNT(*) FROM "LocalAdminApplication" GROUP BY status;
-- SELECT status, COUNT(*) FROM "DonationProject"       GROUP BY status;
-- SELECT status, COUNT(*) FROM "Donation"              GROUP BY status;
-- SELECT status, COUNT(*) FROM "Payment"               GROUP BY status;
-- SELECT status, COUNT(*) FROM "Cause"                 GROUP BY status;
-- SELECT status, COUNT(*) FROM "Task"                  GROUP BY status;
-- SELECT status, COUNT(*) FROM "JobPost"               GROUP BY status;
-- SELECT status, COUNT(*) FROM "Report"                GROUP BY status;
-- SELECT role,   COUNT(*) FROM "User"                  GROUP BY role;
-- SELECT "accountStatus", COUNT(*) FROM "User"         GROUP BY "accountStatus";

-- ── TaskSubmission: PENDING / APPROVED / REJECTED ─────────────────────────
UPDATE "TaskSubmission" SET status = 'PENDING'  WHERE upper(status) IN ('PENDING','SUBMITTED');
UPDATE "TaskSubmission" SET status = 'APPROVED' WHERE upper(status) IN ('APPROVED','ACCEPTED');
UPDATE "TaskSubmission" SET status = 'REJECTED' WHERE upper(status) = 'REJECTED';

-- ── JobApplication: SUBMITTED / ACCEPTED / REJECTED ───────────────────────
UPDATE "JobApplication" SET status = 'SUBMITTED' WHERE upper(status) IN ('SUBMITTED','PENDING');
UPDATE "JobApplication" SET status = 'ACCEPTED'  WHERE upper(status) IN ('ACCEPTED','APPROVED');
UPDATE "JobApplication" SET status = 'REJECTED'  WHERE upper(status) = 'REJECTED';

UPDATE "JobApplication" SET "feeStatus" = 'FREE'     WHERE upper("feeStatus") IN ('FREE','');
UPDATE "JobApplication" SET "feeStatus" = 'VERIFIED' WHERE upper("feeStatus") IN ('VERIFIED','PAID');
UPDATE "JobApplication" SET "feeStatus" = 'PENDING'  WHERE upper("feeStatus") IN ('PENDING','UNPAID');

-- ── OrgMembership / CauseJoinRequest / LocalAdminApplication ──────────────
UPDATE "OrgMembership"         SET status = upper(status);
UPDATE "CauseJoinRequest"      SET status = upper(status);
UPDATE "LocalAdminApplication" SET status = upper(status);
UPDATE "Report"                SET status = upper(status);

UPDATE "LocalAdminApplication" SET status = 'APPROVED' WHERE status IN ('ACCEPTED','APPROVE');
UPDATE "LocalAdminApplication" SET status = 'REJECTED' WHERE status = 'REJECT';

-- ── Projects / Causes / Tasks / Jobs: uppercase everything ────────────────
UPDATE "DonationProject" SET status = upper(status);
UPDATE "DonationProject" SET status = 'ACTIVE' WHERE status IN ('OPEN','RUNNING');
UPDATE "Cause"           SET status = upper(status);
UPDATE "Task"            SET status = upper(status);
UPDATE "JobPost"         SET status = upper(status);
UPDATE "Donation"        SET status = upper(status);
UPDATE "Payment"         SET status = upper(status);
UPDATE "User"            SET role = upper(role);
UPDATE "User"            SET "accountStatus" = upper(coalesce("accountStatus", 'ACTIVE'));
UPDATE "PointLedger"     SET reason = upper(reason);

-- ── Verify nothing unexpected survived. These MUST all return 0 rows. ─────
-- SELECT * FROM "TaskSubmission"   WHERE status NOT IN ('PENDING','APPROVED','REJECTED');
-- SELECT * FROM "JobApplication"   WHERE status NOT IN ('SUBMITTED','ACCEPTED','REJECTED');
-- SELECT * FROM "Payment"          WHERE status NOT IN ('INITIATED','SUCCESS','FAILED');
-- SELECT * FROM "User"             WHERE role   NOT IN ('MEMBER','LOCAL_ADMIN','SUPER_ADMIN');

COMMIT;