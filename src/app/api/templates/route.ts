import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/db/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const supabase = createServerSupabaseClient();

    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const id = searchParams.get('id');

    // Fetch single template by ID with HTML content
    if (id) {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!data) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      // Fetch HTML content from html_url with caching
      let htmlContent = '';
      if (data.html_url) {
        try {
          // Cache for 1 hour at CDN/edge level
          const htmlRes = await fetch(data.html_url, {
            next: { revalidate: 3600 },
          });
          if (htmlRes.ok) htmlContent = await htmlRes.text();
        } catch {
          // html_url fetch failed, return empty content
        }
      }

      return NextResponse.json(
        { template: data, html: htmlContent },
        {
          headers: {
            'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
          },
        }
      );
    }

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
      return NextResponse.json(
        { categories },
        {
          headers: {
            'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
          },
        }
      );
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

      return NextResponse.json(
        { templates: data },
        {
          headers: {
            'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
          },
        }
      );
    }

    return NextResponse.json({ error: 'Missing type or category parameter' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}
