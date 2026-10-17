import { PrismaClient } from '@prisma/client';
import { DEMO_EMAIL } from '@bizznex/shared';
import { DEMO_PASSWORD, resetDemoWorkspace } from '../src/demo/demo-workspace';

const prisma = new PrismaClient();

resetDemoWorkspace(prisma)
  .then(() => {
    // eslint-disable-next-line no-console
    console.log(`Seeded demo user  →  ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  })
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
