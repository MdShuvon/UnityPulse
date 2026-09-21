// core-api/src/services/paymentService.ts
// FULL REPLACEMENT — fixes issues #1 and #8
//
// What changed:
//   1. PAYMENT_MODE now comes from validated env and defaults to 'production'.
//      env.ts refuses to boot if NODE_ENV=production and PAYMENT_MODE=mock.
//   2. SSLCommerz verification is actually implemented: the IPN/redirect handler
//      calls sslcommerz.validate({ val_id }) and only writes SUCCESS when the
//      gateway confirms the transaction AND the amount and currency match what
//      we stored. Nothing the browser sends is trusted.
//   3. Every callback URL is built from env.API_PUBLIC_URL / env.FRONTEND_URL —
//      no hardcoded localhost, so the gateway can actually reach the IPN.
//   4. Real customer details are sent instead of "Customer / customer@example.com".
//   5. Verification is idempotent: a Payment already in SUCCESS returns early,
//      so gateway retries cannot double-apply anything.
//   6. The full gateway response is stored in Payment.rawPayload for disputes.

import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { PaymentStatus, ApplicationStatus, FeeStatus } from '../constants/status';
import { toPaisa } from '../lib/money';

// sslcommerz-lts ships CommonJS only.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SSLCommerzPayment = require('sslcommerz-lts');

export interface InitiateResult {
  paymentId: string;
  gatewayUrl: string;
  amount: number; // paisa
  transactionId: string;
}

export interface VerifyResult {
  verified: boolean;
  message: string;
  paymentId?: string;
}

function gateway() {
  return new SSLCommerzPayment(
    env.SSLCOMMERZ_STORE_ID,
    env.SSLCOMMERZ_STORE_PASSWORD,
    !env.SSLCOMMERZ_SANDBOX, // third arg is is_live
  );
}

export class PaymentService {

  // ── INITIATE ─────────────────────────────────────────────────────────────
  async initiatePayment(applicationId: string, userId: string): Promise<InitiateResult> {
    const transactionId = `UP-${applicationId.slice(-6)}-${Date.now()}`;

    const application = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        feeStatus: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
        job: { select: { title: true, applicationFee: true } },
      },
    });
    if (!application) throw new Error('Application পাওয়া যায়নি');

    // মালিকানা যাচাই
    if (application.user.id !== userId) throw new Error('এই application আপনার নয়');

    // ইতিমধ্যে পরিশোধ হলে আবার নয়
    if (application.feeStatus === FeeStatus.VERIFIED) {
      throw new Error('এই application-এর ফি ইতিমধ্যে পরিশোধ হয়েছে');
    }

    // Amount সবসময় DB থেকে, client থেকে নয়
    const amountTaka = application.job.applicationFee;
    if (!amountTaka || amountTaka <= 0) throw new Error('এই job-এ কোনো ফি নেই');
    const amountInPaisa = toPaisa(amountTaka);

    if (env.PAYMENT_MODE === 'mock') {
      const payment = await prisma.payment.create({
        data: {
          applicationId,
          amount: amountInPaisa,
          status: PaymentStatus.INITIATED,
          method: 'mock',
          gatewayTrxId: transactionId,
        },
      });
      return {
        paymentId: payment.id,
        transactionId,
        amount: amountInPaisa,
        gatewayUrl:
          `${env.FRONTEND_URL}/career/payment/mock` +
          `?paymentId=${payment.id}&amount=${amountTaka}`,
      };
    }

    // Create the Payment row BEFORE contacting the gateway, so an IPN that
    // arrives before our response is handled can still find its record.
    const payment = await prisma.payment.create({
      data: {
        applicationId,
        amount: amountInPaisa,
        status: PaymentStatus.INITIATED,
        method: 'sslcommerz',
        gatewayTrxId: transactionId,
      },
    });

    const paymentData = {
      total_amount: amountTaka,
      currency: 'BDT',
      tran_id: transactionId,

      success_url: `${env.API_PUBLIC_URL}/career/payment/success`,
      fail_url: `${env.API_PUBLIC_URL}/career/payment/fail`,
      cancel_url: `${env.API_PUBLIC_URL}/career/payment/cancel`,
      ipn_url: `${env.API_PUBLIC_URL}/career/payment/ipn`,

      product_name: `Application fee — ${application.job.title}`,
      product_category: 'Service',
      product_profile: 'non-physical-goods',

      cus_name: application.user.name,
      cus_email: application.user.email,
      cus_phone: application.user.phone,
      cus_add1: 'N/A',
      cus_city: 'N/A',
      cus_country: 'Bangladesh',

      shipping_method: 'NO',
    };

    try {
      const response = await gateway().init(paymentData);
      if (!response?.GatewayPageURL) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED, rawPayload: response ?? {} },
        });
        throw new Error('SSLCommerz initiation failed');
      }

      return {
        paymentId: payment.id,
        transactionId,
        amount: amountInPaisa,
        gatewayUrl: response.GatewayPageURL,
      };
    } catch (err) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      }).catch(() => {});
      console.error('SSLCommerz init error:', err);
      throw new Error('Payment initiation failed');
    }
  }

  // ── VERIFY (IPN / success redirect) ──────────────────────────────────────
  /**
   * The ONLY path that may mark a payment SUCCESS.
   *
   * @param tranId  tran_id echoed back by the gateway (our gatewayTrxId)
   * @param valId   val_id from the gateway — required in production
   */
  async verifyPayment(tranId: string, valId?: string): Promise<VerifyResult> {
    const payment = await prisma.payment.findUnique({
      where: { gatewayTrxId: tranId },
      select: { id: true, amount: true, status: true, applicationId: true },
    });
    if (!payment) return { verified: false, message: 'Payment পাওয়া যায়নি' };

    // Idempotency: gateways retry the IPN. Already-settled payments return early.
    if (payment.status === PaymentStatus.SUCCESS) {
      return { verified: true, message: 'Already verified', paymentId: payment.id };
    }

    if (env.PAYMENT_MODE === 'mock') {
      await this.settle(payment.id, payment.applicationId, { mock: true });
      return { verified: true, message: 'Mock payment verified', paymentId: payment.id };
    }

    if (!valId) {
      return { verified: false, message: 'val_id missing — cannot verify' };
    }

    let validation: any;
    try {
      validation = await gateway().validate({ val_id: valId });
    } catch (err) {
      console.error('SSLCommerz validate error:', err);
      return { verified: false, message: 'Gateway validation call failed' };
    }

    const statusOk =
      validation?.status === 'VALID' || validation?.status === 'VALIDATED';
    const tranMatches = validation?.tran_id === tranId;
    const currencyOk = validation?.currency_type === 'BDT' || validation?.currency === 'BDT';

    // Compare in paisa. Never compare floats directly.
    const gatewayPaisa = toPaisa(Number(validation?.currency_amount ?? validation?.amount ?? 0));
    const amountOk = gatewayPaisa === payment.amount;

    if (!statusOk || !tranMatches || !currencyOk || !amountOk) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED, rawPayload: validation ?? {} },
      });
      return {
        verified: false,
        message:
          `Verification failed (status=${validation?.status}, tranMatch=${tranMatches}, ` +
          `currencyOk=${currencyOk}, expected=${payment.amount}p got=${gatewayPaisa}p)`,
        paymentId: payment.id,
      };
    }

    await this.settle(payment.id, payment.applicationId, validation);
    return { verified: true, message: 'Payment verified', paymentId: payment.id };
  }

  /** Mark SUCCESS and advance the application, atomically. */
  private async settle(paymentId: string, applicationId: string | null, raw: any) {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.SUCCESS,
          verifiedAt: new Date(),
          rawPayload: raw ?? {},
          method: raw?.card_type ?? undefined,
        },
      });

      if (applicationId) {
        await tx.jobApplication.update({
          where: { id: applicationId },
          data: {
            status: ApplicationStatus.SUBMITTED,
            feeStatus: FeeStatus.VERIFIED,
          },
        });
      }
    });
  }

  // ── STATUS (safe to expose to the applicant) ─────────────────────────────
  async getPaymentStatus(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { status: true, amount: true, verifiedAt: true },
    });
    if (!payment) throw new Error('Payment পাওয়া যায়নি');
    return {
      status: payment.status,
      verified: payment.status === PaymentStatus.SUCCESS,
      amount: payment.amount,
      verifiedAt: payment.verifiedAt,
    };
  }
}

export const paymentService = new PaymentService();