// core-api/tests/payment.test.ts — fixes part of issue #15
//
// These are the tests worth writing first: the paths where a bug costs money
// or leaks access. Run with `npm test` (see package.json changes in FIXES.md).
//
// Deliberately NOT tested: UI, formatting, anything where a bug is merely
// annoying. Coverage percentage is not the goal; covering the expensive
// failures is.

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { toPaisa, fromPaisa } from '../src/lib/money';

const prisma = new PrismaClient();

describe('money conversion', () => {
  test('taka to paisa is exact for values that break floats', () => {
    assert.equal(toPaisa(0.1), 10);
    assert.equal(toPaisa(0.2), 20);
    assert.equal(toPaisa(1234.56), 123456);
    // 0.1 + 0.2 !== 0.3 in float, but the paisa sum is exact
    assert.equal(toPaisa(0.1) + toPaisa(0.2), toPaisa(0.3));
  });

  test('round trip preserves value', () => {
    assert.equal(fromPaisa(toPaisa(99.99)), 99.99);
  });

  test('rejects negative amounts', () => {
    assert.throws(() => toPaisa(-5));
  });
});

describe('donation idempotency', () => {
  let projectId: string;

  before(async () => {
    // Assumes a seeded org + area. Adjust to your seed.
    const project = await prisma.donationProject.findFirst();
    if (!project) throw new Error('Seed a DonationProject before running tests');
    projectId = project.id;
  });

  test('duplicate paymentRef cannot create a second donation', async () => {
    const ref = `TEST-${Date.now()}`;

    await prisma.donation.create({
      data: { projectId, amount: 10000, method: 'test', paymentRef: ref, status: 'VERIFIED' },
    });

    await assert.rejects(
      prisma.donation.create({
        data: { projectId, amount: 10000, method: 'test', paymentRef: ref, status: 'VERIFIED' },
      }),
      (err: any) => err.code === 'P2002',
      'the unique constraint on paymentRef must reject the retry',
    );

    await prisma.donation.deleteMany({ where: { paymentRef: ref } });
  });
});

describe('like uniqueness', () => {
  test('a user cannot like the same comment twice', async () => {
    const comment = await prisma.comment.findFirst();
    const user = await prisma.user.findFirst();
    if (!comment || !user) return; // nothing seeded, skip

    const first = await prisma.like.create({
      data: { userId: user.id, commentId: comment.id },
    });

    await assert.rejects(
      prisma.like.create({ data: { userId: user.id, commentId: comment.id } }),
      'the partial unique index from migration 02 must reject this',
    );

    await prisma.like.delete({ where: { id: first.id } });
  });
});

after(async () => {
  await prisma.$disconnect();
});