import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { date, memberId, amount, method } = await request.json();

    // 회원 이름 조회
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('name')
      .eq('id', memberId)
      .single();

    if (memberError) {
      throw new Error(`회원 정보 조회 실패: ${memberError.message}`);
    }

    // Supabase에 새 특별회비 기록 생성
    const { data: specialFee, error } = await supabase
      .from('special_fees')
      .insert({
        member_id: memberId,
        member_name: member?.name || '회원',
        date: date,
        amount: amount,
        method: method
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`특별회비 기록 생성 실패: ${error.message}`);
    }

    // 생성된 레코드의 ID를 반환
    return NextResponse.json({
      id: specialFee.id,
      success: true
    });
  } catch (error) {
    console.error('Error adding special fee:', error);
    return NextResponse.json({ 
      error: '특별회비 기록에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 