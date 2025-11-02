/**
 * Partner API - List Agents
 * GET /api/partner/v1/companies/[id]/agents
 * 
 * שליפת רשימת אג'נטים של חברה
 */

import { NextRequest, NextResponse } from 'next/server';
import { validatePartnerApiKey, createErrorResponse, canAccessCompany, logPartnerRequest } from '@/lib/partner-auth';
import { createClient } from '@supabase/supabase-js';
import type { GetAgentsResponse } from '@/types/partner-api.types';

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
    
    // בדיקת הרשאה
    if (!canAccessCompany(partner, companyId)) {
      await logPartnerRequest(partner.key_id!, request, 403, Date.now() - startTime);
      return createErrorResponse(
        'INSUFFICIENT_PERMISSIONS',
        'You do not have permission to access this company',
        403
      );
    }
    
    // בדיקה אם החברה קיימת
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .single();
    
    if (companyError || !company) {
      await logPartnerRequest(partner.key_id!, request, 404, Date.now() - startTime);
      return createErrorResponse('COMPANY_NOT_FOUND', 'Company not found', 404);
    }
    
    // שליפת אג'נטים (דרך raw query כי auth.users לא נגיש דרך client רגיל)
    const { data: users, error: usersError } = await supabase
      .from('auth.users')
      .select('id, email, raw_user_meta_data, created_at')
      .eq('raw_user_meta_data->company_id', companyId);
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      await logPartnerRequest(partner.key_id!, request, 500, Date.now() - startTime);
      return createErrorResponse(
        'INTERNAL_ERROR',
        'Failed to fetch agents',
        500,
        { db_error: usersError.message }
      );
    }
    
    // עבור כל אג'נט, שלוף סטטיסטיקות
    const agentsWithStats = await Promise.all(
      (users || []).map(async (user: any) => {
        // ספירת שיחות
        const { count: callCount } = await supabase
          .from('calls')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        // חישוב ציון ממוצע
        const { data: calls } = await supabase
          .from('calls')
          .select('content_analysis')
          .eq('user_id', user.id)
          .not('content_analysis', 'is', null);
        
        let averageScore = null;
        if (calls && calls.length > 0) {
          const scores = calls
            .map((c: any) => c.content_analysis?.overall_score)
            .filter((s: any) => s !== null && s !== undefined);
          
          if (scores.length > 0) {
            averageScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
          }
        }
        
        return {
          id: user.id,
          email: user.email,
          name: user.raw_user_meta_data?.name || 'Unknown',
          role: user.raw_user_meta_data?.role || 'agent',
          created_at: user.created_at,
          total_calls: callCount || 0,
          average_score: averageScore ? Math.round(averageScore * 10) / 10 : null,
        };
      })
    );
    
    // תשובה
    const response: GetAgentsResponse = {
      agents: agentsWithStats,
      total: agentsWithStats.length,
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
    console.error('List agents error:', error);
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

