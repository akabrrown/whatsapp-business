// Seed: categories, Accra delivery zones, owner account.
// Catalog starts empty: real products are added from the admin dashboard (§11.1).
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { pesewas } from '@rose/shared';

const db = new PrismaClient();

async function main() {
  const owner = await db.adminUser.upsert({
    where: { email: process.env.OWNER_EMAIL ?? 'akayetb@gmail.com' },
    update: {},
    create: {
      email: process.env.OWNER_EMAIL ?? 'akayetb@gmail.com',
      name: 'Tobi',
      role: 'owner',
      password: await bcrypt.hash(process.env.OWNER_PASSWORD ?? 'Option#5', 10),
    },
  });

  const cats = [
    { name: 'Jeans', slug: 'jeans', flagship: true },
    { name: 'Female Wears', slug: 'female-wears', flagship: false },
    { name: 'Slippers', slug: 'slippers', flagship: false },
    { name: 'Bags', slug: 'bags', flagship: false },
    { name: 'Accessories', slug: 'accessories', flagship: false },
  ];
  const catIds: Record<string, string> = {};
  for (const c of cats) {
    let row = await db.category.findFirst({ where: { slug: c.slug, parentId: null } });
    if (row) {
      row = await db.category.update({ where: { id: row.id }, data: { flagship: c.flagship } });
    } else {
      row = await db.category.create({ data: c });
    }
    catIds[c.slug] = row.id;
  }
  void catIds; // retained shape for future category-dependent seeding

  // Accra delivery zones (name + aliases + coordinates for pin matching)
  const zones = [
    { name: 'East Legon', feeP: pesewas(25), aliases: '["east legon","eastlegon","legon"]', lat: 5.636, lng: -0.184 },
    { name: 'Osu', feeP: pesewas(20), aliases: '["oxford street","oxford st"]', lat: 5.556, lng: -0.181 },
    { name: 'Airport Residential', feeP: pesewas(25), aliases: '["airport","airport city"]', lat: 5.605, lng: -0.171 },
    { name: 'Cantonments', feeP: pesewas(20), aliases: '[]', lat: 5.577, lng: -0.173 },
    { name: 'Spintex', feeP: pesewas(30), aliases: '["spintex road"]', lat: 5.631, lng: -0.129 },
    { name: 'Dansoman', feeP: pesewas(30), aliases: '[]', lat: 5.558, lng: -0.254 },
    { name: 'Madina', feeP: pesewas(30), aliases: '["madina market"]', lat: 5.683, lng: -0.166 },
    { name: 'Tema', feeP: pesewas(40), aliases: '["tema community","comm"]', lat: 5.669, lng: -0.017 },
  ];
  for (const z of zones) {
    await db.deliveryZone.upsert({
      where: { name: z.name },
      update: { feeP: z.feeP },
      create: z,
    });
  }

  console.log(`Seeded: owner ${owner.email}, ${cats.length} categories, ${zones.length} zones. Catalog is empty: add products from the admin dashboard.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
