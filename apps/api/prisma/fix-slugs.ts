import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const categories = await db.category.findMany({ include: { parent: true } });

  // Find duplicates
  const slugCounts = new Map<string, number>();
  for (const c of categories) {
    slugCounts.set(c.slug, (slugCounts.get(c.slug) || 0) + 1);
  }

  const duplicates = [...slugCounts.entries()].filter(([_, count]) => count > 1).map(([slug]) => slug);
  
  if (duplicates.length === 0) {
    console.log('No duplicate slugs found.');
    return;
  }

  console.log('Found duplicate slugs:', duplicates);

  for (const dupSlug of duplicates) {
    const cats = categories.filter(c => c.slug === dupSlug);
    for (const c of cats) {
      if (c.parent) {
        const parentSlug = c.parent.slug;
        const newSlug = `${parentSlug}-${dupSlug}`;
        
        await db.category.update({
          where: { id: c.id },
          data: { slug: newSlug }
        });
        console.log(`Updated slug for "${c.name}" to: ${newSlug}`);
      }
    }
  }
}

main().catch(console.error).finally(() => db.$disconnect());
