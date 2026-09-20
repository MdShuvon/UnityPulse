-- Step 1: enum type বানাও (যদি না থাকে)
DO $$ BEGIN
  CREATE TYPE "PointReason" AS ENUM ('DONATION', 'TASK');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: column-টা text → enum-এ convert করো (data safe)
ALTER TABLE "PointLedger"
  ALTER COLUMN reason TYPE "PointReason"
  USING reason::text::"PointReason";