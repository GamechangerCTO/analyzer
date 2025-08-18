import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { LEGAL_TERMS_VERSION } from '@/lib/constants'

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userRow, error: userRowError } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (userRowError || !userRow) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // רק למנהלים/בעלים נדרש אישור
  if (!(userRow.role === 'manager' || userRow.role === 'owner')) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const headers = req.headers
  const ip = headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const userAgent = headers.get('user-agent') || null

  const { error: insertError } = await supabase
    .from('legal_terms_acceptances')
    .insert({
      user_id: user.id,
      company_id: userRow.company_id,
      user_role: userRow.role,
      terms_version: LEGAL_TERMS_VERSION,
      ip_address: ip,
      user_agent: userAgent,
    })

  if (insertError && !insertError.message.includes('duplicate key')) {
    return NextResponse.json({ error: insertError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

