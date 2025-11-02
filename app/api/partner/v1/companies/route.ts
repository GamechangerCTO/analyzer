/**
 * GET /api/partner/v1/companies
 * גילוי חברות קיימות - לשימוש Partner API
 * מחזיר רשימת חברות שהשותף יכול לגשת אליהן
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validatePartnerAuth } from '@/lib/partner-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    // אימות Partner API Key
    const authResult = await validatePartnerAuth(request);
    
    if (!authResult.success || !authResult.partner) {
      return NextResponse.json(
        { 
          error: { 
            code: 'UNAUTHORIZED', 
            message: authResult.error || 'Invalid or missing API credentials' 
          } 
        },
        { status: 401 }
      );
    }

    const partner = authResult.partner;

    // בדיקה אם השותף מוגבל לחברה ספציפית
    if (partner.company_id) {
      // אם השותף קשור לחברה ספציפית, החזר רק אותה
      const { data: company, error } = await supabase
        .from('companies')
        .select('id, name, industry, created_at')
        .eq('id', partner.company_id)
        .single();

      if (error) {
        console.error('Error fetching company:', error);
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Company not found or no access' } },
          { status: 404 }
        );
      }

      return NextResponse.json({
        companies: [company],
        total: 1,
        partner_access: 'single_company',
        message: 'This API key has access to a single company only'
      });
    }

    // אם השותף לא מוגבל, החזר את כל החברות
    // (בעתיד ניתן להוסיף pagination כאן)
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const search = url.searchParams.get('search') || '';

    let query = supabase
      .from('companies')
      .select('id, name, industry, created_at', { count: 'exact' })
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    // אם יש חיפוש, סנן לפי שם או תעשייה
    if (search) {
      query = query.or(`name.ilike.%${search}%,industry.ilike.%${search}%`);
    }

    const { data: companies, error, count } = await query;

    if (error) {
      console.error('Error fetching companies:', error);
      return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch companies' } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      companies: companies || [],
      total: count || 0,
      limit,
      offset,
      partner_access: 'all_companies',
      message: 'This API key has access to all companies'
    });

  } catch (error: any) {
    console.error('Unexpected error in companies discovery:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: error.message } },
      { status: 500 }
    );
  }
}

