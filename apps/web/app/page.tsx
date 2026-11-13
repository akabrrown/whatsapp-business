import { api } from '@/lib/api';
import { HomeClientView } from '@/components/HomeClientView';

export default async function HomePage() {
  let products = await api.catalog().catch(() => []);
  let categories = await api.categories().catch(() => []);

  const safeProducts = Array.isArray(products) ? products : [];
  const safeCategories = Array.isArray(categories) ? categories : [];

  return <HomeClientView products={safeProducts} categories={safeCategories} />;
}
