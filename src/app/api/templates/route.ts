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

    // Fetch subcategories for a specific category with counts
    if (type === 'subcategories' && category) {
      const { data, error } = await supabase
        .from('templates')
        .select('subcategory')
        .eq('category', category)
        .eq('is_active', true)
        .not('subcategory', 'is', null);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Count subcategories
      const subcategoryMap = new Map<string, number>();
      data.forEach((row: { subcategory: string | null }) => {
        if (row.subcategory) {
          subcategoryMap.set(row.subcategory, (subcategoryMap.get(row.subcategory) || 0) + 1);
        }
      });

      const subcategories = Array.from(subcategoryMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      return NextResponse.json(
        { subcategories },
        {
          headers: {
            'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
          },
        }
      );
    }

    if (category) {
      // Pagination parameters
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
      const offset = (page - 1) * pageSize;

      // Filter parameters
      const subcategory = searchParams.get('subcategory');
      const search = searchParams.get('search');

      // Build query filters
      let countQuery = supabase
        .from('templates')
        .select('*', { count: 'exact', head: true })
        .eq('category', category)
        .eq('is_active', true);

      let dataQuery = supabase
        .from('templates')
        .select('id, name, category, subcategory, description, slug, thumbnail_url, html_url, tags, is_premium, sort_order, popularity')
        .eq('category', category)
        .eq('is_active', true);

      // Apply subcategory filter
      if (subcategory) {
        countQuery = countQuery.eq('subcategory', subcategory);
        dataQuery = dataQuery.eq('subcategory', subcategory);
      }

      // Apply search filter (ILIKE for case-insensitive)
      if (search && search.trim()) {
        const searchPattern = `%${search.trim()}%`;
        const orFilter = `name.ilike.${searchPattern},description.ilike.${searchPattern}`;
        countQuery = countQuery.or(orFilter);
        dataQuery = dataQuery.or(orFilter);
      }

      // Get total count
      const { count, error: countError } = await countQuery;

      if (countError) {
        return NextResponse.json({ error: countError.message }, { status: 500 });
      }

      // Get paginated templates
      const { data, error } = await dataQuery
        .order('sort_order')
        .order('popularity', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(
        {
          templates: data,
          pagination: {
            page,
            pageSize,
            total: count ?? 0,
            totalPages: Math.ceil((count ?? 0) / pageSize),
            hasMore: offset + pageSize < (count ?? 0),
          },
          filters: {
            subcategory: subcategory || null,
            search: search || null,
          },
        },
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
