// core-api/src/routes/paymentCallbacks.ts
// NEW FILE — the gateway-facing half of issue #1.
//
// Register in server.ts:  await app.register(paymentCallbackRoutes);
//
// Three rules encoded here:
//   1. Only the server-to-server IPN and the val_id-bearing success callback may
//      settle a payment. A plain browser redirect settles nothing.
//   2. These routes are unauthenticated (SSLCommerz has no session) but they are
//      safe, because verifyPayment() re-validates with the gateway and compares
//      the stored amount. Forging a call gains nothing.
//   3. They are exempt from the global rate limit — the gateway retries, and a
//      429 on an IPN means a lost payment.

import { FastifyInstance } from 'fastify';
import { paymentService } from '../services/paymentService';
import { env } from '../config/env';

export async function paymentCallbackRoutes(app: FastifyInstance) {

  // Server-to-server IPN. Authoritative.
  app.post('/career/payment/ipn', {
    config: { rateLimit: false },
  }, async (req, reply) => {
    const body = req.body as any;
    const tranId = body?.tran_id;
    const valId = body?.val_id;

    if (!tranId) return reply.code(400).send({ error: 'tran_id missing' });

    try {
      const result = await paymentService.verifyPayment(tranId, valId);
      req.log.info({ tranId, verified: result.verified, msg: result.message }, 'IPN processed');
      return reply.code(200).send({ received: true });
    } catch (err) {
      req.log.error({ err, tranId }, 'IPN processing failed');
      return reply.code(500).send({ error: 'temporary failure' });
    }
  });

  // Browser lands here after paying. We still verify server-side before redirecting.
  app.post('/career/payment/success', { config: { rateLimit: false } }, async (req, reply) => {
    const body = req.body as any;
    const result = await paymentService.verifyPayment(body?.tran_id, body?.val_id);
    const status = result.verified ? 'success' : 'failed';
    return reply.redirect(`${env.FRONTEND_URL}/career/mine?payment=${status}`);
  });

  app.post('/career/payment/fail', { config: { rateLimit: false } }, async (_req, reply) =>
    reply.redirect(`${env.FRONTEND_URL}/career/mine?payment=failed`));

  app.post('/career/payment/cancel', { config: { rateLimit: false } }, async (_req, reply) =>
    reply.redirect(`${env.FRONTEND_URL}/career/mine?payment=cancelled`));

  // Some gateway configurations use GET for the redirect URLs.
  app.get('/career/payment/success', { config: { rateLimit: false } }, async (req, reply) => {
    const q = req.query as any;
    const result = await paymentService.verifyPayment(q?.tran_id, q?.val_id);
    return reply.redirect(
      `${env.FRONTEND_URL}/career/mine?payment=${result.verified ? 'success' : 'failed'}`);
  });
}