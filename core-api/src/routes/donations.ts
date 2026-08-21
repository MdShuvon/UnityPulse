import { FastifyInstance } from 'fastify';
import { donationService }  from '../services/donationService';
import { donationEmitter }  from '../lib/redis';
import { donateSchema }     from '../schemas/donationSchema';

export async function donationRoutes(app: FastifyInstance) {

  // GET /donations/projects — সব active project
  app.get('/donations/projects', async (req, reply) => {
    const projects = await donationService.getAllProjects();
    return reply.send(projects);
  });

  // GET /donations/projects/:id — একটা project detail
  app.get('/donations/projects/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const project = await donationService.getProjectDetail(id);
    return reply.send(project);
  });

  // POST /donations/projects/:id/donate — Guest বা Member
  app.post('/donations/projects/:id/donate', async (req, reply) => {
    const { id }    = req.params as { id: string };
    const data      = donateSchema.parse(req.body);
    const userId    = (req.session as any)?.userId; // login থাকলে

    const result = await donationService.donate(id, {
      ...data,
      userId: userId || undefined,
    });

    return reply.code(201).send({
      message: 'Donation সফল! ধন্যবাদ',
      donation: result,
    });
  });

  // GET /donations/live — SSE live feed
  app.get('/donations/live', async (req, reply) => {
    // SSE headers set করো
    reply.raw.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Connection alive রাখো
    const keepAlive = setInterval(() => {
      reply.raw.write(': ping\n\n');
    }, 30000);

    // নতুন donation এলে client কে পাঠাও
    const handler = (data: any) => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    donationEmitter.on('new', handler);

    // Client disconnect হলে cleanup করো
    req.raw.on('close', () => {
      clearInterval(keepAlive);
      donationEmitter.off('new', handler);
    });
  });
}