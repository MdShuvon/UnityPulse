import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  
  if (!adminEmail) {
    throw new Error('SEED_ADMIN_EMAIL missing in .env');
  }

  const user = await prisma.user.findUnique({ where: { email: adminEmail } });
  
  if (!user) {
    throw new Error(`No user found with email: ${adminEmail}`);
  }

  await prisma.user.update({
    where: { email: adminEmail },
    data: { role: 'SUPER_ADMIN' },
  });

  console.log(`User ${adminEmail} is now SUPER_ADMIN`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());