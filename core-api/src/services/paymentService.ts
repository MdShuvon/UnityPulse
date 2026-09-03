import { prisma } from '../lib/prisma';

const MODE = process.env.PAYMENT_MODE || 'mock';

export interface PaymentVerifyResult {
  verified: boolean;
  amount: number;
  trxId: string;
  message?: string;
}

export class PaymentService {

  // ── INITIATE PAYMENT ──────────────────────────────
  async initiatePayment(applicationId: string, amount: number) {
    const amountInPaisa = Math.round(amount * 100);

    if (MODE === 'mock') {
      const payment = await prisma.payment.create({
        data: {
          applicationId,
          amount: amountInPaisa,
          status: 'INITIATED',
          method: 'mock',
        },
      });

      return {
        paymentId: payment.id,
        gatewayUrl: `http://localhost:5173/career/payment/mock?paymentId=${payment.id}&amount=${amount}`,
        amount: amountInPaisa,
      };
    }

    // SSLCommerz Production
    const SSLCommerz = require('sslcommerz-lts');
    
    const sslcommerz = new SSLCommerz(
      process.env.SSLCOMMERZ_STORE_ID,
      process.env.SSLCOMMERZ_STORE_PASSWORD,
      process.env.SSLCOMMERZ_SANDBOX === 'true'
    );

    const transactionId = `TXN-${Date.now()}`;

    const paymentData = {
      total_amount: amount,
      currency: 'BDT',
      tran_id: transactionId,
      success_url: `http://localhost:3001/career/payment/success?applicationId=${applicationId}`,
      fail_url: `http://localhost:3001/career/payment/fail?applicationId=${applicationId}`,
      cancel_url: `http://localhost:3001/career/payment/cancel?applicationId=${applicationId}`,
      ipn_url: 'http://localhost:3001/career/payment/ipn',
      product_name: 'Job Application Fee',
      product_category: 'Application',
      product_profile: 'general',
      cus_name: 'Customer',
      cus_email: 'customer@example.com',
      cus_phone: '01700000000',
    };

    try {
      const response = await sslcommerz.init(paymentData);
      
      if (response?.GatewayPageURL) {
        // Save payment record
        const payment = await prisma.payment.create({
          data: {
            applicationId,
            amount: amountInPaisa,
            status: 'INITIATED',
            method: 'sslcommerz',
            gatewayTrxId: transactionId,
          },
        });

        return {
          paymentId: payment.id,
          gatewayUrl: response.GatewayPageURL,
          amount: amountInPaisa,
        };
      }
      
      throw new Error('SSLCommerz initiation failed');
    } catch (err) {
      console.error('SSLCommerz init error:', err);
      throw new Error('Payment initiation failed');
    }
  }

  // ── VERIFY PAYMENT (IPN / Webhook) ────────────────
  async verifyPayment(paymentId: string, gatewayTrxId: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new Error('Payment পাওয়া যায়নি');

    if (MODE === 'mock') {
      // Mock verify — সব success
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'SUCCESS',
          gatewayTrxId,
          verifiedAt: new Date(),
        },
      });

      // // Application status update
      // if (payment.applicationId) {
      //   await prisma.jobApplication.update({
      //     where: { id: payment.applicationId },
      //     data: { status: 'SUBMITTED', feeStatus: 'paid' },
      //   });
      // }

     // Application status update - keep PENDING for admin review
       if (payment.applicationId) {
        await prisma.jobApplication.update({
          where: { id: payment.applicationId },
          data: { status: 'SUBMITTED', feeStatus: 'VERIFIED' },
        });
      }

      return { verified: true, message: 'Payment verified' };
    }

    // SSLCommerz validation API call
    return { verified: false, message: 'Not implemented' };
  }
    // ── VERIFY (Legacy method for career service) ────
  async verify(paymentRef: string, expectedAmount: number): Promise<PaymentVerifyResult> {
    if (MODE === 'mock') {
      return {
        verified: true,
        amount: expectedAmount,
        trxId: paymentRef,
        message: 'Mock verified',
      };
    }
    
    // Production: SSLCommerz verify
    return {
      verified: false,
      amount: 0,
      trxId: paymentRef,
      message: 'Not implemented',
    };
  }
  // ── CHECK PAYMENT STATUS ─────────────────────────
  async getPaymentStatus(paymentId: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new Error('Payment পাওয়া যায়নি');
    return {
      status: payment.status,
      verified: payment.status === 'SUCCESS',
    };
  }
}

export const paymentService = new PaymentService();