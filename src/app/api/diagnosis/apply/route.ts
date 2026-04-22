import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendApplicationNotification } from '@/lib/email';
import { sendMetaCAPIEvent } from '@/lib/meta-capi';
import { notifyDiagnosticApplication } from '@/lib/slack';

export async function POST(request: NextRequest) {
  try {
    const { name, phone, preferredDate, preferredTime } = await request.json();

    if (!name?.trim() || !phone?.trim() || !preferredDate || !preferredTime) {
      return NextResponse.json({ error: '모든 필드를 입력해주세요.' }, { status: 400 });
    }

    const phoneClean = phone.replace(/\D/g, '');
    if (phoneClean.length < 7) {
      return NextResponse.json({ error: '올바른 전화번호를 입력해주세요.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('diagnostic_applications')
      .insert([{
        name: name.trim(),
        phone: phone.trim(),
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        status: 'pending',
      }])
      .select()
      .single();

    if (error) {
      console.error('[apply] DB insert error:', error);
      return NextResponse.json({ error: '신청 처리 중 오류가 발생했습니다.' }, { status: 500 });
    }

    // Send email notification (non-blocking)
    sendApplicationNotification({
      name: name.trim(),
      phone: phone.trim(),
      preferredDate,
      preferredTime,
      createdAt: data.created_at,
    }).catch(err => console.error('[apply] Email error:', err));

    // Send Slack notification (non-blocking)
    notifyDiagnosticApplication({
      name: name.trim(),
      phone: phone.trim(),
      preferredDate,
      preferredTime,
    }).catch(err => console.error('[apply] Slack error:', err));

    // Send Meta CAPI event (non-blocking)
    sendMetaCAPIEvent({
      eventName: 'Lead',
      userData: {
        ph: phone.trim(),
        fn: name.trim().split(' ')[0],
      },
      customData: {
        content_name: 'diagnosis_application',
        currency: 'KRW',
        value: 0,
      },
    }).catch(err => console.error('[apply] CAPI error:', err));

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) {
    console.error('[apply] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
