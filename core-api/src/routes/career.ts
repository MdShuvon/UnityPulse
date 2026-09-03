import { FastifyInstance } from 'fastify';
import { careerService }   from '../services/careerService';
import { paymentService }  from '../services/paymentService';
import { requireAuth }     from '../middleware/authGuard';
import { prisma }          from '../lib/prisma';

export async function careerRoutes(app: FastifyInstance) {

  // GET /career/jobs?q=&department=&type=&limit=&page=
  // Fix 8: Filter support
  app.get('/career/jobs', async (req, reply) => {
    const { q, department, type, limit = '20', page = '1' } = req.query as any;
    return reply.send(await careerService.getJobs({
      q, department, jobType: type,
      limit: Math.max(1, +limit),
      page:  Math.max(1, +page),
    }));
  });

  // GET /career/jobs/:id
  app.get('/career/jobs/:id', async (req, reply) => {
    return reply.send(await careerService.getJob((req.params as any).id));
  });

  // POST /career/jobs/:id/apply — CV + optional paymentRef
  app.post('/career/jobs/:id/apply',
    { preHandler: requireAuth },
    async (req, reply) => {
      const userId = (req.session as any).userId;
      const jobId  = (req.params as any).id;

      // File upload handle
      let cvFile: any = null;
      let paymentRef: string | undefined;

      for await (const part of req.parts()) {
        if (part.type === 'file' && part.fieldname === 'cv') {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) chunks.push(chunk);
          cvFile = { buffer: Buffer.concat(chunks), mimetype: part.mimetype, filename: part.filename };
        } else if (part.type === 'field' && part.fieldname === 'paymentRef') {
          paymentRef = part.value as string;
        }
      }

      if (!cvFile) return reply.code(400).send({ error: 'CV file দাও (PDF)' });

      const result = await careerService.applyForJob(userId, jobId, cvFile, paymentRef);
      return reply.code(201).send(result);
    }
  );

  // GET /career/my-applications
  app.get('/career/my-applications', { preHandler: requireAuth }, async (req, reply) => {
    return reply.send(await careerService.getMyApplications((req.session as any).userId));
  });

  // GET /career/my-applications/:id/cv — presigned URL
  app.get('/career/my-applications/:id/cv', { preHandler: requireAuth }, async (req, reply) => {
    const userId = (req.session as any).userId;
    return reply.send(await careerService.getCvPresignedUrl((req.params as any).id, userId));
  });

    // POST /career/payment/initiate — payment start
  app.post('/career/payment/initiate',
    { preHandler: requireAuth },
    async (req, reply) => {
      const { applicationId, amount } = req.body as any;
      const result = await paymentService.initiatePayment(applicationId, amount);
      return reply.send(result);
    }
  );

  // POST /career/payment/verify — IPN/webhook
  app.post('/career/payment/verify', async (req, reply) => {
    const { paymentId, gatewayTrxId } = req.body as any;
    const result = await paymentService.verifyPayment(paymentId, gatewayTrxId);
    return reply.send(result);
  });

  // GET /career/payment/:id/status — frontend poll
  app.get('/career/payment/:id/status', async (req, reply) => {
    const { id } = req.params as any;
    const result = await paymentService.getPaymentStatus(id);
    return reply.send(result);
  });

    // GET /career/payment/success
  app.get('/career/payment/success', async (req, reply) => {
    const { applicationId } = req.query as any;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return reply.redirect(`${frontendUrl}/career/mine?payment=success`);
  });

  // GET /career/payment/fail
  app.get('/career/payment/fail', async (req, reply) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return reply.redirect(`${frontendUrl}/career/mine?payment=failed`);
  });

  // GET /career/payment/cancel
  app.get('/career/payment/cancel', async (req, reply) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return reply.redirect(`${frontendUrl}/career/mine?payment=cancelled`);
  });

  // POST /career/payment/ipn — SSLCommerz server-to-server notification
  app.post('/career/payment/ipn', async (req, reply) => {
    const data = req.body as any;
    
    if (data.status === 'VALID' || data.status === 'VALIDATED') {
      // Verify with SSLCommerz validation API
      const SSLCommerz = require('sslcommerz-lts');
      const sslcommerz = new SSLCommerz(
        process.env.SSLCOMMERZ_STORE_ID,
        process.env.SSLCOMMERZ_STORE_PASSWORD,
        process.env.SSLCOMMERZ_SANDBOX === 'true'
      );

      try {
        const validation = await sslcommerz.validate({
          val_id: data.val_id,
        });

        if (validation?.status === 'VALID' || validation?.status === 'VALIDATED') {
          // Update payment
          await prisma.payment.updateMany({
            where: { gatewayTrxId: data.tran_id },
            data: { status: 'SUCCESS', verifiedAt: new Date(), gatewayTrxId: data.tran_id },
          });

          // Update application
          const payment = await prisma.payment.findFirst({
            where: { gatewayTrxId: data.tran_id },
          });
          
          if (payment?.applicationId) {
            await prisma.jobApplication.update({
              where: { id: payment.applicationId },
              data: { status: 'SUBMITTED', feeStatus: 'VERIFIED' },
            });
          }
        }
      } catch (err) {
        console.error('SSLCommerz validation error:', err);
      }
    }

    return reply.send({ status: 'ok' });
  });
}