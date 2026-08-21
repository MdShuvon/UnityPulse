import { FastifyInstance }               from 'fastify';
import { localAdminService }           from '../services/localAdminService';
import { requireAuth }                 from '../middleware/authGuard';
import { localAdminApplicationSchema } from '../schemas/phase8Schema';

async function bufferFile(part: any) {
  const chunks: Buffer[] = [];
  for await (const chunk of part.file) chunks.push(chunk);
  return { buffer: Buffer.concat(chunks), mimetype: part.mimetype, filename: part.filename };
}

export async function localAdminRoutes(app: FastifyInstance) {

  // app.post('/local-admin/apply', { preHandler: requireAuth }, async (req, reply) => {
  //   const userId = (req.session as any).userId;
  //   let bodyData: any = {};
  //   let bankProof:     any = null;
  //   let emergencyProof: any = null;

  //   for await (const part of req.parts()) {
  //     if (part.type === 'file') {
  //       // Bug 7 fix: buffer immediately
  //       const buffered = await bufferFile(part);
  //       if (part.fieldname === 'bankProof')       bankProof      = buffered;
  //       if (part.fieldname === 'emergencyProof')  emergencyProof = buffered;
  //     } else if (part.type === 'field') {
  //       if (part.fieldname === 'data') {
  //         try { bodyData = JSON.parse(part.value as string); }
  //         catch { bodyData[part.fieldname] = part.value; }
  //       } else {
  //         bodyData[part.fieldname] = part.value;
  //       }
  //     }
  //   }

  //   if (!bankProof) return reply.code(400).send({ error: 'Bank proof document দিতে হবে' });

  //   const data   = localAdminApplicationSchema.parse(bodyData);
  //   const result = await localAdminService.submitApplication(userId, data, bankProof, emergencyProof);
  //   return reply.code(201).send(result);
  // });

  // app.get('/local-admin/my-application', { preHandler: requireAuth }, async (req, reply) => {
  //   const app = await localAdminService.getMyApplication((req.session as any).userId);
  //   if (!app) return reply.code(404).send({ error: 'কোনো application নেই' });
  //   return reply.send(app);
  // });
  // POST /local-admin/apply — JSON version (simpler for testing)
app.post('/local-admin/apply', { preHandler: requireAuth }, async (req, reply) => {
  const userId = (req.session as any).userId;
  const { orgName, areaId, memberCount, isEmergency } = req.body as any;

  // Dummy bank proof for test
  const bankProof = {
    buffer: Buffer.from('dummy proof'),
    mimetype: 'image/jpeg',
    filename: 'proof.jpg'
  };

  const result = await localAdminService.submitApplication(
    userId,
    { orgName, areaId, memberCount: Number(memberCount), isEmergency },
    bankProof
  );
  return reply.code(201).send(result);
});
}