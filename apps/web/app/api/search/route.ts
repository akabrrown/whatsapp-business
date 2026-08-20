import { NextResponse } from 'next/server';
import { api } from '@/lib/api';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const c = searchParams.get('category') || undefined;
  
  if (!q) {
    return NextResponse.json({ products: [] });
  }

  try {
    const products = await api.search(q, c);
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 });
  }
}
