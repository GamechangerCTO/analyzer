/**
 * Partner API - Get Company Details
 * GET /api/partner/v1/companies/[id]
 * 
 * שליפת פרטי חברה
 */

import { NextRequest, NextResponse } from 'next/server';
import { validatePartnerApiKey, createErrorResponse, canAccessCompany, logPartnerRequest } from '@/lib/partner-auth';
import { createClient } from '@supabase/supabase-js';
import type { GetCompanyResponse } from '@/types/partner-api.types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  
  try {
    // אימות API key
    const authResult = await validatePartnerApiKey(request);
    
    if (!authResult.success) {
      await logPartnerRequest(null, request, 401, Date.now() - startTime);
      return authResult.error!;
    }
    
    const partner = authResult.partner!;
    const companyId = params.id;
    
    // בדיקת הרשאה לגשת לחברה
    if (!canAccessCompany(partner, companyId)) {
      await logPartnerRequest(partner.key_id!, request, 403, Date.now() - startTime);
      return createErrorResponse(
        'INSUFFICIENT_PERMISSIONS',
        'You do not have permission to access this company',
        403
      );
    }
    
    // שליפת פרטי חברה
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();
    
    if (companyError || !company) {
      await logPartnerRequest(partner.key_id!, request, 404, Date.now() - startTime);
      return createErrorResponse('COMPANY_NOT_FOUND', 'Company not found', 404);
    }
    
    // שליפת שאלון
    const { data: questionnaire } = await supabase
      .from('company_questionnaires')
      .select('*')
      .eq('company_id', companyId)
      .single();
    
    // ספירת אג'נטים
    const { count: agentCount } = await supabase
      .from('auth.users')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);
    
    // ספירת שיחות
    const { count: callCount } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);
    
    // תשובה
    const response: GetCompanyResponse = {
      id: company.id,
      name: company.name,
      industry: company.industry || null,
      created_at: company.created_at,
      questionnaire_data: questionnaire || null,
      total_agents: agentCount || 0,
      total_calls: callCount || 0,
    };
    
    await logPartnerRequest(partner.key_id!, request, 200, Date.now() - startTime);
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': 'v1',
      },
    });
    
  } catch (error: any) {
    console.error('Get company error:', error);
    await logPartnerRequest(null, request, 500, Date.now() - startTime);
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500,
      { message: error.message }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, X-API-Secret, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

