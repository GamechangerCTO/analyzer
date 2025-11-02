/**
 * Partner API - Create Agent
 * POST /api/partner/v1/companies/[id]/agents/create
 * 
 * יצירת אג'נט חדש עם סיסמה זמנית
 */

import { NextRequest, NextResponse } from 'next/server';
import { validatePartnerApiKey, createErrorResponse, canAccessCompany, logPartnerRequest } from '@/lib/partner-auth';
import { createClient } from '@supabase/supabase-js';
import type { CreateAgentRequest, CreateAgentResponse } from '@/types/partner-api.types';

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

// פונקציה ליצירת סיסמה אקראית
function generateTemporaryPassword(): string {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

export async function POST(
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
    let body: CreateAgentRequest;
    try {
      body = await request.json();
    } catch {
      await logPartnerRequest(partner.key_id!, request, 400, Date.now() - startTime);
      return createErrorResponse('INVALID_INPUT', 'Invalid JSON body', 400);
    }
    
    // Validation
    if (!body.email || !body.name) {
      await logPartnerRequest(partner.key_id!, request, 400, Date.now() - startTime);
      return createErrorResponse(
        'INVALID_INPUT',
        'Missing required fields: email, name',
        400
      );
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      await logPartnerRequest(partner.key_id!, request, 400, Date.now() - startTime);
      return createErrorResponse('INVALID_INPUT', 'Invalid email format', 400);
    }
    
    // בדיקה אם החברה קיימת
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .single();
    
    if (companyError || !company) {
      await logPartnerRequest(partner.key_id!, request, 404, Date.now() - startTime);
      return createErrorResponse('COMPANY_NOT_FOUND', 'Company not found', 404);
    }
    
    // בדיקת מכסת משתמשים
    const { data: canAdd } = await supabase.rpc('can_add_user_to_company', {
      company_uuid: companyId,
    });
    
    if (!canAdd) {
      await logPartnerRequest(partner.key_id!, request, 403, Date.now() - startTime);
      return createErrorResponse(
        'INSUFFICIENT_PERMISSIONS',
        'Company has reached its user limit. Please upgrade the subscription.',
        403
      );
    }
    
    // יצירת סיסמה זמנית
    const temporaryPassword = generateTemporaryPassword();
    
    // יצירת משתמש ב-Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        name: body.name,
        company_id: companyId,
        role: body.role || 'agent',
        phone: body.phone || null,
      },
    });
    
    if (authError) {
      console.error('Error creating user:', authError);
      await logPartnerRequest(partner.key_id!, request, 500, Date.now() - startTime);
      
      // אם המשתמש כבר קיים
      if (authError.message.includes('already registered')) {
        return createErrorResponse(
          'DUPLICATE_REQUEST',
          'A user with this email already exists',
          409
        );
      }
      
      return createErrorResponse(
        'INTERNAL_ERROR',
        'Failed to create agent',
        500,
        { auth_error: authError.message }
      );
    }
    
    // עדכון הפרופיל של המשתמש
    const { error: updateError } = await supabase
      .from('auth.users')
      .update({
        raw_user_meta_data: {
          name: body.name,
          company_id: companyId,
          role: body.role || 'agent',
          phone: body.phone || null,
        },
      })
      .eq('id', authData.user.id);
    
    if (updateError) {
      console.error('Error updating user metadata:', updateError);
      // לא נכשיל את כל הבקשה בגלל זה
    }
    
    // תשובה
    const response: CreateAgentResponse = {
      agent_id: authData.user.id,
      temporary_password: temporaryPassword,
      status: 'created',
      message: `Agent '${body.name}' created successfully. Send the temporary password to the user securely.`,
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
    console.error('Create agent error:', error);
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
      'Access-Control-Allow-Headers': 'Authorization, X-API-Secret, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

