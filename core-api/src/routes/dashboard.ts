import { FastifyInstance }   from 'fastify';
import { dashboardService } from '../services/dashboardService';

export async function dashboardRoutes(app: FastifyInstance) {
  app.get('/dashboard',                  async (_, reply) => reply.send(await dashboardService.getStats()));
  app.get('/dashboard/highlights',       async (_, reply) => reply.send(await dashboardService.getHighlights()));
  app.get('/dashboard/live-transactions',async (_, reply) => reply.send(await dashboardService.getLiveTransactions()));
}