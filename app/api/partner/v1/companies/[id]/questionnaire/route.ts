/**
 * Partner API - Update Company Questionnaire
 * PUT /api/partner/v1/companies/[id]/questionnaire
 * 
 * עדכון שאלון חברה
 */

import { NextRequest, NextResponse } from 'next/server';
import { validatePartnerApiKey, createErrorResponse, canAccessCompany, logPartnerRequest } from '@/lib/partner-auth';
import { createClient } from '@supabase/supabase-js';
import type { UpdateQuestionnaireRequest, UpdateQuestionnaireResponse } from '@/types/partner-api.types';

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

export async function PUT(
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
    
    // קריאת body
    let body: UpdateQuestionnaireRequest;
    try {
      body = await request.json();
    } catch {
      await logPartnerRequest(partner.key_id!, request, 400, Date.now() - startTime);
      return createErrorResponse('INVALID_INPUT', 'Invalid JSON body', 400);
    }
    
    if (!body.questionnaire_data) {
      await logPartnerRequest(partner.key_id!, request, 400, Date.now() - startTime);
      return createErrorResponse('INVALID_INPUT', 'Missing questionnaire_data', 400);
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
    
    // בדיקה אם קיים שאלון
    const { data: existing } = await supabase
      .from('company_questionnaires')
      .select('id')
      .eq('company_id', companyId)
      .single();
    
    // עדכון או יצירה
    let error;
    if (existing) {
      // עדכון
      const result = await supabase
        .from('company_questionnaires')
        .update(body.questionnaire_data)
        .eq('company_id', companyId);
      error = result.error;
    } else {
      // יצירה
      const result = await supabase
        .from('company_questionnaires')
        .insert({
          company_id: companyId,
          ...body.questionnaire_data,
        });
      error = result.error;
    }
    
    if (error) {
      console.error('Error updating questionnaire:', error);
      await logPartnerRequest(partner.key_id!, request, 500, Date.now() - startTime);
      return createErrorResponse(
        'INTERNAL_ERROR',
        'Failed to update questionnaire',
        500,
        { db_error: error.message }
      );
    }
    
    // תשובה
    const response: UpdateQuestionnaireResponse = {
      success: true,
      message: 'Questionnaire updated successfully',
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
    console.error('Update questionnaire error:', error);
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
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, X-API-Secret, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

