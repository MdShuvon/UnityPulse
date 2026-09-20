-- migrations/02b_cleanup_old_like_indexes.sql
-- Removes the old, ineffective unique indexes that 02_fix_like_uniqueness.sql
-- could not drop via DROP CONSTRAINT (Prisma db push created them as indexes,
-- not table constraints). The new partial indexes already do the real job.

BEGIN;

DROP INDEX IF EXISTS "Like_userId_postId_key";
DROP INDEX IF EXISTS "Like_userId_commentId_key";

COMMIT;