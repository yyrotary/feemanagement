import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { phone, rotaryYear = 'current' } = await request.json();
    console.log('Searching for phone:', phone, 'rotaryYear:', rotaryYear);

    // 회기 정보 조회
    const keyName = rotaryYear === 'current' ? 'rotary_year_start' : 'previous_year_start';
    const endKeyName = rotaryYear === 'current' ? 'rotary_year_end' : 'previous_year_end';
    
    const { data: rotaryYearInfo, error: rotaryError } = await supabase
      .from('master_info')
      .select('key, value')
      .in('key', [keyName, endKeyName]);
    
    if (rotaryError) {
      throw new Error(`회기 정보 조회 실패: ${rotaryError.message}`);
    }
    
    const startDate = rotaryYearInfo?.find(item => item.key === keyName)?.value;
    const endDate = rotaryYearInfo?.find(item => item.key === endKeyName)?.value;
    
    if (!startDate || !endDate) {
      throw new Error('회기 정보를 찾을 수 없습니다.');
    }
    
    console.log('Rotary year date range:', startDate, 'to', endDate);

    // 회원 정보 조회
    const { data: members, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('phone', Number(phone))
      .limit(1);

    if (memberError) {
      throw new Error(`회원 조회 실패: ${memberError.message}`);
    }

    console.log('Member response:', members);

    if (!members || members.length === 0) {
      return NextResponse.json({ error: '회원을 찾을 수 없습니다.' }, { status: 404 });
    }

    const member = members[0];
    console.log('Member properties:', member);

    const name = member.name || '';
    const nickname = member.nickname || '';

    console.log('Deduction field:', member.deduction);

    // deduction 배열에 'senior'가 있는지 확인
    const isElder = Array.isArray(member.deduction) && 
                   member.deduction.some((item: string) => item === 'senior') || false;
    const requiredFee = isElder ? 200000 : 720000;

    console.log('Deduction values:', member.deduction);
    console.log('Is senior:', isElder);
    console.log('Required fee:', requiredFee);

    // 해당 회기의 회비 내역 조회 (날짜 범위로 필터링)
    const { data: feeHistory, error: feeError } = await supabase
      .from('fees')
      .select('date, amount, method')
      .eq('member_id', member.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (feeError) {
      throw new Error(`회비 내역 조회 실패: ${feeError.message}`);
    }

    console.log('Fee response for rotary year:', feeHistory);

    const formattedFeeHistory = feeHistory?.map((fee) => {
      const method = Array.isArray(fee.method) ? fee.method : [fee.method || 'deposit'];
      console.log('General Fee method from Supabase:', method, typeof method);
      return {
        date: fee.date,
        paid_fee: fee.amount,
        method
      };
    }) || [];

    const totalPaid = formattedFeeHistory.reduce((sum, fee) => sum + fee.paid_fee, 0);
    const remainingFee = Math.max(0, requiredFee - totalPaid);

    return NextResponse.json({
      id: member.id,
      name,
      nickname,
      totalPaid,
      remainingFee,
      feeHistory: formattedFeeHistory,
      rotaryYear: rotaryYear === 'current' ? '25-26' : '24-25',
      dateRange: `${startDate} ~ ${endDate}`
    });

  } catch (error) {
    console.error('Error details:', error);
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}