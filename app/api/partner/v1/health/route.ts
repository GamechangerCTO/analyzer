/**
 * Partner API - Health Check Endpoint
 * GET /api/partner/v1/health
 * 
 * Endpoint פשוט לבדיקת חיבור ואימות API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { validatePartnerApiKey, createErrorResponse, logPartnerRequest } from '@/lib/partner-auth';
import type { HealthCheckResponse } from '@/types/partner-api.types';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // אימות API key
    const authResult = await validatePartnerApiKey(request);
    
    if (!authResult.success) {
      // לוג request (גם אם נכשל)
      await logPartnerRequest(null, request, 401, Date.now() - startTime);
      return authResult.error!;
    }
    
    const partner = authResult.partner!;
    
    // יצירת תשובה
    const response: HealthCheckResponse = {
      status: 'ok',
      environment: partner.environment!,
      partner_name: partner.partner_name!,
      timestamp: new Date().toISOString(),
      version: 'v1',
    };
    
    // לוג request מוצלח
    await logPartnerRequest(
      partner.key_id!,
      request,
      200,
      Date.now() - startTime
    );
    
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': 'v1',
      },
    });
    
  } catch (error: any) {
    console.error('Health check error:', error);
    
    await logPartnerRequest(null, request, 500, Date.now() - startTime);
    
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500,
      {
        message: error.message,
      }
    );
  }
}

// OPTIONS method for CORS preflight
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

