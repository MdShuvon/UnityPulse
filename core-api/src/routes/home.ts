import { FastifyInstance }   from 'fastify';
import { homeService } from '../services/homeService';

export async function homeRoutes(app: FastifyInstance) {
  app.get('/home',                  async (_, reply) => reply.send(await homeService.getStats()));
  app.get('/home/highlights',       async (_, reply) => reply.send(await homeService.getHighlights()));
  app.get('/home/live-transactions',async (_, reply) => reply.send(await homeService.getLiveTransactions()));
}