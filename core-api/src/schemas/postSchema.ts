import { z } from 'zod';

export const createPostSchema = z.object({
  content:    z.string().max(2000).optional(),
  visibility: z.enum(['PUBLIC', 'ORG_ONLY', 'MEMBERS_ONLY']).default('PUBLIC'),
});

export const editPostSchema = z.object({
  content:    z.string().max(2000).optional(),
  visibility: z.enum(['PUBLIC', 'ORG_ONLY', 'MEMBERS_ONLY']).optional(),
});

export const createCommentSchema = z.object({
  content:  z.string().min(1).max(500),
  parentId: z.string().optional(),
});

// Fix 1: Comment edit schema
export const editCommentSchema = z.object({
  content: z.string().min(1, 'Comment empty হতে পারবে না').max(500),
});

export const reportSchema = z.object({
  reason:     z.string().min(5).max(200),
  targetType: z.enum(['POST', 'COMMENT']),
});

export const handleReportSchema = z.object({
  action: z.enum(['HIDE', 'REMOVE', 'DISMISS']),
  note:   z.string().max(200).optional(),
});