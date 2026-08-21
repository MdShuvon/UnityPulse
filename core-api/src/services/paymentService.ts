import { prisma } from '../lib/prisma';

const MODE = process.env.PAYMENT_MODE || 'mock';

export interface PaymentVerifyResult {
  verified:  boolean;
  amount:    number;
  currency:  string;
  trxId:     string;
  message?:  string;
}

export class PaymentService {

  // ── VERIFY PAYMENT ────────────────────────────────────────────────────
  // Fix 2: Amount validate করো — fee mismatch block করো
  async verify(
    paymentRef:     string,
    expectedAmount: number
  ): Promise<PaymentVerifyResult>{

    // Fix 2: Idempotent check — same ref already used in any application?
    const alreadyUsed = await prisma.jobApplication.findFirst({
      where: { paymentRef, feeStatus: 'paid' },
    });
    if (alreadyUsed) {
      return { verified: false, amount: 0, currency: 'BDT', trxId: paymentRef,
               message: 'এই payment ref ইতিমধ্যে use হয়েছে' };
    }

    if (MODE === 'mock') {
      return this.verifyMock(paymentRef, expectedAmount);
    }

    return this.verifyBkash(paymentRef, expectedAmount);
  }

  // ── MOCK MODE (Development) ───────────────────────────────────────────
  // যেকোনো trxId accept করে — development এ আটকায় না
  private verifyMock(trxId: string, expectedAmount: number): PaymentVerifyResult {
    console.log(`[MOCK PAYMENT] trxId: ${trxId}, amount: ${expectedAmount}`);
    return {
      verified: true,
      amount:   expectedAmount,
      currency: 'BDT',
      trxId,
      message:  'Mock payment verified (development mode)',
    };
  }

  // ── bKash VERIFY (Production) ─────────────────────────────────────────
  private async verifyBkash(
    trxId:          string,
    expectedAmount: number
  ): Promise<PaymentVerifyResult> {
    try {
      // Step 1: bKash token নাও
      const tokenRes = await fetch(
        `${process.env.BKASH_BASE_URL}/tokenized/checkout/token/grant`,
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'username':      process.env.BKASH_USERNAME!,
            'password':      process.env.BKASH_PASSWORD!,
          },
          body: JSON.stringify({
            app_key:    process.env.BKASH_APP_KEY,
            app_secret: process.env.BKASH_APP_SECRET,
          }),
        }
      );
      const tokenData = await tokenRes.json() as any;
      if (!tokenData.id_token) throw new Error('bKash token নেওয়া যায়নি');

      // Step 2: Transaction query করো
      const queryRes = await fetch(
        `${process.env.BKASH_BASE_URL}/tokenized/checkout/general/searchTransaction`,
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': tokenData.id_token,
            'X-APP-Key':     process.env.BKASH_APP_KEY!,
          },
          body: JSON.stringify({ trxID: trxId }),
        }
      );
      const data = await queryRes.json() as any;

      if (data.statusCode !== '0000') {
        return { verified: false, amount: 0, currency: 'BDT', trxId,
                 message: 'Transaction পাওয়া যায়নি বা invalid' };
      }

      const actualAmount = parseFloat(data.amount || '0');

      // Fix 2: Amount validate করো
      if (actualAmount < expectedAmount) {
        return { verified: false, amount: actualAmount, currency: 'BDT', trxId,
                 message: `Payment কম — expected: ${expectedAmount}, got: ${actualAmount}` };
      }

      return { verified: true, amount: actualAmount, currency: 'BDT', trxId };

    } catch (err) {
      console.error('bKash verify error:', err);
      return { verified: false, amount: 0, currency: 'BDT', trxId,
               message: 'Payment verify করতে সমস্যা হয়েছে' };
    }
  }

  // ── MARK REFUND PENDING ───────────────────────────────────────────────
  // Fix 3: CV upload fail হলে call করো
  async markRefundPending(applicationId: string, reason: string) {
    await prisma.jobApplication.update({
      where: { id: applicationId },
      data:  { feeStatus: 'refund_pending' },
    });
    console.warn(`Refund pending: applicationId=${applicationId}, reason=${reason}`);
  }
}

export const paymentService = new PaymentService();