import { FastifyInstance } from 'fastify';
import { orgService } from '../services/orgService';
import { joinRequestSchema } from '../schemas/orgSchema';
import { requireAuth } from '../middleware/authGuard';

export async function orgRoutes(app: FastifyInstance) {

  // GET /areas — সব area
  app.get('/areas', async (req, reply) => {
    return reply.send(await orgService.getAreas());
  });

  // GET /areas/:areaId/organizations — area এর orgs
  app.get('/areas/:areaId/organizations', async (req, reply) => {
    const { areaId } = req.params as { areaId: string };
    return reply.send(await orgService.getOrgsByArea(areaId));
  });

  // GET /organizations/:orgId/members
  app.get('/organizations/:orgId/members', async (req, reply) => {
    const { orgId } = req.params as { orgId: string };
    return reply.send(await orgService.getOrgMembers(orgId));
  });

  // POST /organizations/join — multipart (NID photo + data)
  app.post('/organizations/join',
    { preHandler: requireAuth },
    async (req, reply) => {
      const userId = (req.session as any).userId;
      const parts  = req.parts();
      let orgId = '', nidNumber = '';
      let nidPhotoFile: any = null;

      for await (const part of parts) {
        if (part.type === 'field' && part.fieldname === 'orgId')
          orgId = part.value as string;
        if (part.type === 'field' && part.fieldname === 'nidNumber')
          nidNumber = part.value as string;
        if (part.type === 'file' && part.fieldname === 'nidPhoto')
          nidPhotoFile = part;
      }

      if (!orgId || !nidNumber || !nidPhotoFile)
        return reply.code(400).send({ error: 'orgId, nidNumber এবং nidPhoto দাও' });

      joinRequestSchema.parse({ orgId, nidNumber });
      const result = await orgService.joinRequest(userId, orgId, nidNumber, nidPhotoFile);
      return reply.code(201).send(result);
    }
  );
}