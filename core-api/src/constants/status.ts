// core-api/src/constants/status.ts
// NEW FILE — fixes issue #4 (inconsistent status string literals)
//
// Import these everywhere instead of typing string literals. Once schema.prisma
// uses the matching Prisma enums, TypeScript will reject any typo at compile
// time instead of silently matching zero rows.
//
// Canonical vocabulary decided here:
//   Review workflows  → PENDING / APPROVED / REJECTED
//   Job applications  → SUBMITTED / ACCEPTED / REJECTED  (a submission is not a request to review; it IS the review queue)
//   Payment           → INITIATED / SUCCESS / FAILED
//
// If you prefer a single vocabulary everywhere, change JobApplicationStatus to
// PENDING/APPROVED/REJECTED and run the same normalisation migration. Pick one
// and never mix.

export const SubmissionStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type SubmissionStatus = typeof SubmissionStatus[keyof typeof SubmissionStatus];

export const MembershipStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type MembershipStatus = typeof MembershipStatus[keyof typeof MembershipStatus];

export const JoinRequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type JoinRequestStatus = typeof JoinRequestStatus[keyof typeof JoinRequestStatus];

export const ApplicationStatus = {
  SUBMITTED:       'SUBMITTED',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  ACCEPTED:        'ACCEPTED',
  REJECTED:        'REJECTED',
} as const;
export type ApplicationStatus = typeof ApplicationStatus[keyof typeof ApplicationStatus];

export const FeeStatus = {
  FREE: 'FREE',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
} as const;
export type FeeStatus = typeof FeeStatus[keyof typeof FeeStatus];

export const PaymentStatus = {
  INITIATED: 'INITIATED',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
} as const;
export type PaymentStatus = typeof PaymentStatus[keyof typeof PaymentStatus];

export const DonationStatus = {
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  FAILED: 'FAILED',
} as const;
export type DonationStatus = typeof DonationStatus[keyof typeof DonationStatus];

export const ProjectStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CLOSED: 'CLOSED',
} as const;
export type ProjectStatus = typeof ProjectStatus[keyof typeof ProjectStatus];

export const CauseStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
} as const;
export type CauseStatus = typeof CauseStatus[keyof typeof CauseStatus];

export const TaskStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
} as const;
export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];

export const JobStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
} as const;
export type JobStatus = typeof JobStatus[keyof typeof JobStatus];

export const AccountStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;
export type AccountStatus = typeof AccountStatus[keyof typeof AccountStatus];

export const ReviewStatus = {
  PENDING:   'PENDING',
  APPROVED:  'APPROVED',
  REJECTED:  'REJECTED',
  REVIEWED:  'REVIEWED',
  DISMISSED: 'DISMISSED',
} as const;
export type ReviewStatus = typeof ReviewStatus[keyof typeof ReviewStatus];
export const Role = {
  MEMBER: 'MEMBER',
  LOCAL_ADMIN: 'LOCAL_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;
export type Role = typeof Role[keyof typeof Role];

export const PointReason = {
  DONATION: 'DONATION',
  TASK: 'TASK',
} as const;
export type PointReason = typeof PointReason[keyof typeof PointReason];

/** Roles allowed into the admin area. */
export const ADMIN_ROLES: Role[] = [Role.LOCAL_ADMIN, Role.SUPER_ADMIN];