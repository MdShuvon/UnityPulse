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
  let areaId: string;
  let orgId: string;
  let userId: string;

  before(async () => {
    // Seed minimal data — CI DB is empty
    const area = await prisma.area.create({
      data: { name: 'Test Area', district: 'Test District', division: 'Test Division' },
    });
    areaId = area.id;

    const user = await prisma.user.create({
      data: {
        name: 'Test Admin',
        email: `test-${Date.now()}@example.com`,
        phone: `01${Date.now().toString().slice(-9)}`,
        password: 'hashed',
        role: 'SUPER_ADMIN',
      },
    });
    userId = user.id;

    const org = await prisma.organization.create({
      data: { name: 'Test Org', areaId, adminId: userId },
    });
    orgId = org.id;

    const project = await prisma.donationProject.create({
      data: {
        title: 'Test Project',
        description: 'For tests',
        goalAmount: 100000,
        orgId,
        createdBy: userId,
      },
    });
    projectId = project.id;
  });

  after(async () => {
    // Cleanup
    await prisma.donation.deleteMany({ where: { projectId } });
    await prisma.donationProject.delete({ where: { id: projectId } });
    await prisma.organization.delete({ where: { id: orgId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.area.delete({ where: { id: areaId } });
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
after(async () => {
  await prisma.$disconnect();
});