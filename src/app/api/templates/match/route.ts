// src/app/api/templates/match/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/db/supabase-server';
import { chatCompletion, getDefaultModel } from '@/lib/ai/llm-client';
import type { TemplateMatchResponse } from '@/types/template';

export const runtime = 'edge';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, userPrompt } = body;
    const limit = Math.min(50, Math.max(1, body.limit || 10));

    // Runtime validation
    if (!category || typeof category !== 'string') {
      return NextResponse.json(
        { error: 'category is required and must be a string' },
        { status: 400 }
      );
    }

    if (!userPrompt || typeof userPrompt !== 'string') {
      return NextResponse.json(
        { error: 'userPrompt is required and must be a string' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Get all active templates for this category
    const { data: templates, error } = await supabase
      .from('templates')
      .select('id, name, category, subcategory, tags, html_url, thumbnail_url')
      .eq('category', category)
      .eq('is_active', true)
      .order('popularity', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      );
    }

    if (!templates || templates.length === 0) {
      return NextResponse.json({
        template: null,
        score: 0,
        message: 'No templates found for this category',
      });
    }

    // If only one template, return it directly
    if (templates.length === 1) {
      return NextResponse.json({
        template: templates[0],
        score: 1.0,
      } as TemplateMatchResponse);
    }

    // Use LLM to select the best matching template
    const matchResult = await selectBestTemplate(templates, userPrompt);

    return NextResponse.json(matchResult);
  } catch (error) {
    console.error('Template match error:', error);
    const message = error instanceof Error ? error.message : 'Template matching failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

async function selectBestTemplate(
  templates: Array<{
    id: string;
    name: string;
    category: string;
    subcategory: string | null;
    tags: string[];
    html_url: string;
    thumbnail_url: string;
  }>,
  userPrompt: string
): Promise<TemplateMatchResponse> {
  const candidatesInfo = templates.map((t, i) => ({
    index: i,
    name: t.name,
    subcategory: t.subcategory,
    tags: t.tags,
  }));

  const systemPrompt = `You are a template matching assistant. Select the best template for the user's request.

Available templates:
${JSON.stringify(candidatesInfo, null, 2)}

Respond with JSON ONLY (no markdown):
{
  "selectedIndex": 0,
  "score": 0.92,
  "reason": "Brief reason for selection"
}

Select based on:
1. Name relevance
2. Subcategory match
3. Tags alignment with user intent`;

  try {
    const responseText = await chatCompletion({
      model: getDefaultModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `User request: ${userPrompt}` },
      ],
    });

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { template: templates[0], score: 0.5 };
    }

    const result = JSON.parse(jsonMatch[0]);
    const selectedIndex = Math.min(
      Math.max(0, result.selectedIndex || 0),
      templates.length - 1
    );

    return {
      template: templates[selectedIndex],
      score: typeof result.score === 'number' ? result.score : 0.8,
    };
  } catch (error) {
    console.error('LLM template selection failed:', error);
    return { template: templates[0], score: 0.5 };
  }
}
