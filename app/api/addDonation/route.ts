import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { date, memberId, paid_fee, method, class: donationClass } = await request.json();

    // 회원 이름 조회
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('name')
      .eq('id', memberId)
      .single();

    if (memberError) {
      throw new Error(`회원 정보 조회 실패: ${memberError.message}`);
    }

    // Supabase에 새 기부 기록 생성
    const { data: donation, error } = await supabase
      .from('donations')
      .insert({
        member_id: memberId,
        member_name: member?.name || '회원',
        date: date,
        amount: paid_fee,
        method: method,
        category: [donationClass] // 배열 형태로 저장
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`기부 기록 생성 실패: ${error.message}`);
    }

    // 생성된 레코드의 ID를 반환
    return NextResponse.json({
      id: donation.id,
      success: true
    });
  } catch (error) {
    console.error('Error adding donation:', error);
    return NextResponse.json({ 
      error: '기부 기록에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 