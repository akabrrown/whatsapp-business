const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
db.category.findMany().then(c => console.log(JSON.stringify(c, null, 2))).finally(() => db.$disconnect());
