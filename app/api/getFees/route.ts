import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const date = searchParams.get('date');
    const rotaryYear = searchParams.get('rotaryYear') || 'current';

    console.log('Request params:', { memberId, date, rotaryYear });

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
    
    console.log('Rotary year date range for fees:', startDate, 'to', endDate);

    // 회비 데이터와 회원 정보를 조인하여 조회 (회기 날짜 범위 적용)
    let query = supabase
      .from('fees')
      .select(`
        id,
        member_id,
        member_name,
        amount,
        date,
        method,
        created_at,
        members:member_id (
          id,
          name,
          nickname
        )
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    // 추가 필터 적용
    if (memberId && date) {
      query = query.eq('member_id', memberId).eq('date', date);
    } else if (memberId) {
      query = query.eq('member_id', memberId);
    } else if (date) {
      query = query.eq('date', date);
    }

    const { data: fees, error } = await query;

    if (error) {
      throw error;
    }

    // 데이터 형식 변환
    const formattedFees = fees.map(fee => {
      let actualMemberName = '회원';

      // 1. members 조인 결과가 있으면 사용 (가장 정확함)
      if (fee.members && (fee.members as any).name) {
        actualMemberName = (fee.members as any).name;
      }
      // 2. member_name이 정상적인 한글 이름인지 확인
      else if (fee.member_name && 
               typeof fee.member_name === 'string' && 
               fee.member_name.length < 10 && 
               /^[가-힣]+$/.test(fee.member_name)) {
        actualMemberName = fee.member_name;
      }
      // 3. member_name이 숫자라면 회원 번호로 처리
      else if (fee.member_name && /^\d+$/.test(fee.member_name)) {
        actualMemberName = `회원${fee.member_name}`;
      }
      // 4. UUID 형태라면 간단히 "회원"으로 처리
      else if (fee.member_name && fee.member_name.includes('1c47c9ec')) {
        actualMemberName = '회원';
      }

      return {
        id: fee.id,
        member_id: fee.member_id,
        memberId: fee.member_id,  // 프론트엔드에서 기대하는 camelCase 필드명
        member_name: actualMemberName,
        memberName: actualMemberName,  // 프론트엔드에서 기대하는 camelCase 필드명
        amount: fee.amount,
        paid_fee: fee.amount,  // 프론트엔드 호환성을 위한 필드 추가
        date: fee.date,
        method: Array.isArray(fee.method) ? fee.method[0] : (fee.method || 'deposit'),
        created_at: fee.created_at
      };
    });

    return NextResponse.json({ 
      fees: formattedFees,
      rotaryYear: rotaryYear === 'current' ? '25-26' : '24-25',
      dateRange: `${startDate} ~ ${endDate}`
    });
  } catch (error) {
    console.error('Error fetching fees:', error);
    return NextResponse.json({ 
      error: '회비 내역을 가져오는데 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 