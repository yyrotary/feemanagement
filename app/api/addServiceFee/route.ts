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
      console.error('회원 정보 조회 실패:', memberError);
      throw new Error(`회원 정보 조회 실패: ${memberError.message}`);
    }

    if (!member || !member.name) {
      throw new Error('회원 정보를 찾을 수 없습니다.');
    }

    console.log('조회된 회원 정보:', member);

    // Supabase에 새 봉사금 기록 생성
    const { data: serviceFee, error } = await supabase
      .from('service_fees')
      .insert({
        member_id: memberId,
        member_name: member.name,
        date: date,
        amount: amount,
        method: method
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`봉사금 기록 생성 실패: ${error.message}`);
    }

    // 생성된 레코드의 ID를 반환
    return NextResponse.json({
      id: serviceFee.id,
      success: true
    });
  } catch (error) {
    console.error('Error adding service fee:', error);
    return NextResponse.json({ 
      error: '봉사금 기록에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}