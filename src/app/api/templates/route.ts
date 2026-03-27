import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/db/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const supabase = createServerSupabaseClient();

    const type = searchParams.get('type');
    const category = searchParams.get('category');

    if (type === 'categories') {
      const { data, error } = await supabase
        .from('templates')
        .select('category')
        .eq('is_active', true)
        .order('category');

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const categories = [...new Set(data.map((row: { category: string }) => row.category))];
      return NextResponse.json({ categories });
    }

    if (category) {
      const { data, error } = await supabase
        .from('templates')
        .select('id, name, category, subcategory, description, slug, thumbnail_url, html_url, tags, is_premium, sort_order, popularity')
        .eq('category', category)
        .eq('is_active', true)
        .order('sort_order')
        .order('popularity', { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ templates: data });
    }

    return NextResponse.json({ error: 'Missing type or category parameter' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}
