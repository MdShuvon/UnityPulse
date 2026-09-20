-- migrations/02_fix_like_uniqueness.sql
-- Fixes issue #11.
--
-- The schema declares:
--     @@unique([userId, postId])
--     @@unique([userId, commentId])
--
-- For a post like, commentId is NULL. For a comment like, postId is NULL.
-- PostgreSQL treats NULL as distinct from every other NULL, so a row with
-- (userId=X, postId=NULL) never collides with another identical row. Neither
-- constraint prevents duplicate likes, and Post.likeCount / Comment.likeCount
-- are denormalised counters, so duplicates corrupt them permanently.
--
-- Fix: partial unique indexes, which Prisma's schema language cannot express,
-- so they are declared here and Prisma is told about them via @@index.

BEGIN;

-- 1. Remove existing duplicates, keeping the earliest like of each pair.
DELETE FROM "Like" a
USING "Like" b
WHERE a.id > b.id
  AND a."userId" = b."userId"
  AND a."postId" IS NOT DISTINCT FROM b."postId"
  AND a."commentId" IS NOT DISTINCT FROM b."commentId";

-- 2. Drop the ineffective constraints.
ALTER TABLE "Like" DROP CONSTRAINT IF EXISTS "Like_userId_postId_key";
ALTER TABLE "Like" DROP CONSTRAINT IF EXISTS "Like_userId_commentId_key";

-- 3. Partial unique indexes that actually hold.
CREATE UNIQUE INDEX IF NOT EXISTS "like_user_post_unique"
  ON "Like" ("userId", "postId")
  WHERE "postId" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "like_user_comment_unique"
  ON "Like" ("userId", "commentId")
  WHERE "commentId" IS NOT NULL;

-- 4. A like must target exactly one thing, never both and never neither.
ALTER TABLE "Like" DROP CONSTRAINT IF EXISTS "like_exactly_one_target";
ALTER TABLE "Like" ADD CONSTRAINT "like_exactly_one_target"
  CHECK (num_nonnulls("postId", "commentId") = 1);

-- 5. Recompute the denormalised counters from the now-clean data.
UPDATE "Post" p SET "likeCount" = (
  SELECT count(*) FROM "Like" l WHERE l."postId" = p.id
);
UPDATE "Comment" c SET "likeCount" = (
  SELECT count(*) FROM "Like" l WHERE l."commentId" = c.id
);

COMMIT;