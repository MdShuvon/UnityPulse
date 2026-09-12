import { FastifyInstance } from 'fastify';
import { exchangeRateService } from '../services/exchangeRateService';

export async function exchangeRateRoutes(app: FastifyInstance) {

  /**
   * GET /exchange-rates
   * Public endpoint — returns BDT-based rates (Redis cached, 6h TTL)
   * Used for display-only conversion on frontend
   */
  app.get('/exchange-rates', async (req, reply) => {
    try {
      const rates = await exchangeRateService.getBdtRates();
      return reply.send(rates);
    } catch (err: any) {
      app.log.error('Exchange rate fetch failed:', err.message);
      return reply.code(503).send({
        error: 'Exchange rates temporarily unavailable',
      });
    }
  });
}