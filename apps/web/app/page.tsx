import { api } from '@/lib/api';
import { HomeClientView } from '@/components/HomeClientView';

export default async function HomePage() {
  let products: Awaited<ReturnType<typeof api.catalog>> = [];
  let categories: Awaited<ReturnType<typeof api.categories>> = [];
  try {
    [products, categories] = await Promise.all([api.catalog(), api.categories()]);
  } catch {
    // render the brand shell even if the API is momentarily down
  }

  return <HomeClientView products={products} categories={categories} />;
}

