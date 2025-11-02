/**
 * Partner API - Create Company
 * POST /api/partner/v1/companies/create
 * 
 * יצירת חברה חדשה עם שאלון אופציונלי
 */

import { NextRequest, NextResponse } from 'next/server';
import { validatePartnerApiKey, createErrorResponse, logPartnerRequest } from '@/lib/partner-auth';
import { createClient } from '@supabase/supabase-js';
import type { CreateCompanyRequest, CreateCompanyResponse } from '@/types/partner-api.types';

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

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // אימות API key
    const authResult = await validatePartnerApiKey(request);
    
    if (!authResult.success) {
      await logPartnerRequest(null, request, 401, Date.now() - startTime);
      return authResult.error!;
    }
    
    const partner = authResult.partner!;
    
    // קריאת body
    let body: CreateCompanyRequest;
    try {
      body = await request.json();
    } catch {
      await logPartnerRequest(partner.key_id!, request, 400, Date.now() - startTime);
      return createErrorResponse('INVALID_INPUT', 'Invalid JSON body', 400);
    }
    
    // Validation
    if (!body.name || !body.contact_email) {
      await logPartnerRequest(partner.key_id!, request, 400, Date.now() - startTime);
      return createErrorResponse(
        'INVALID_INPUT',
        'Missing required fields: name, contact_email',
        400
      );
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.contact_email)) {
      await logPartnerRequest(partner.key_id!, request, 400, Date.now() - startTime);
      return createErrorResponse('INVALID_INPUT', 'Invalid email format', 400);
    }
    
    // יצירת חברה בDB
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: body.name,
        industry: body.industry || null,
      })
      .select()
      .single();
    
    if (companyError) {
      console.error('Error creating company:', companyError);
      await logPartnerRequest(partner.key_id!, request, 500, Date.now() - startTime);
      return createErrorResponse(
        'INTERNAL_ERROR',
        'Failed to create company',
        500,
        { db_error: companyError.message }
      );
    }
    
    // שמירת שאלון אם סופק
    if (body.questionnaire_data) {
      const { error: questionnaireError } = await supabase
        .from('company_questionnaires')
        .insert({
          company_id: company.id,
          ...body.questionnaire_data,
        });
      
      if (questionnaireError) {
        console.error('Error saving questionnaire:', questionnaireError);
        // לא נכשיל את כל הבקשה בגלל זה, רק נתריע
      }
    }
    
    // תשובה
    const response: CreateCompanyResponse = {
      company_id: company.id,
      status: 'created',
      message: `Company '${company.name}' created successfully`,
    };
    
    await logPartnerRequest(partner.key_id!, request, 201, Date.now() - startTime);
    
    return NextResponse.json(response, {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': 'v1',
      },
    });
    
  } catch (error: any) {
    console.error('Create company error:', error);
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, X-API-Secret, Content-Type, X-Idempotency-Key',
      'Access-Control-Max-Age': '86400',
    },
  });
}

