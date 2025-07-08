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
    
    console.log('Rotary year date range for service fees:', startDate, 'to', endDate);

    // 먼저 회원 정보 조회 (memberId가 있는 경우)
    let memberInfo = null;
    if (memberId) {
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('id, name, nickname')
        .eq('id', memberId)
        .single();

      if (memberError) {
        console.error('Member 조회 에러:', memberError);
      } else {
        memberInfo = member;
        console.log('Member 정보:', memberInfo);
      }
    }

    // 기본 쿼리 설정 (회기 날짜 범위 적용)
    let query = supabase
      .from('service_fees')
      .select(`
        id,
        member_id,
        member_name,
        amount,
        date,
        method,
        created_at
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    // 필터 적용
    if (memberId && date) {
      query = query.eq('member_id', memberId).eq('date', date);
    } else if (memberId) {
      query = query.eq('member_id', memberId);
    } else if (date) {
      query = query.eq('date', date);
    }

    const { data: fees, error } = await query;

    if (error) {
      console.error('봉사금 조회 에러:', error);
      throw error;
    }

    console.log('조회된 봉사금 데이터:', fees);

    // 각 봉사금 레코드에 대해 회원 정보 조회
    const formattedFeesPromises = fees.map(async (fee) => {
      let memberName = fee.member_name || '회원';
      
      // member_id가 있으면 최신 회원 정보 조회
      if (fee.member_id) {
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('name')
          .eq('id', fee.member_id)
          .single();
        
        if (!memberError && member) {
          memberName = member.name;
        }
      }
      
      return {
        id: fee.id,
        memberId: fee.member_id,
        memberName: memberName,
        amount: fee.amount,
        date: fee.date,
        method: Array.isArray(fee.method) ? fee.method : [fee.method || 'cash'],
      };
    });

    const formattedFees = await Promise.all(formattedFeesPromises);

    return NextResponse.json({ 
      fees: formattedFees,
      rotaryYear: rotaryYear === 'current' ? '25-26' : '24-25',
      dateRange: `${startDate} ~ ${endDate}`
    });
  } catch (error) {
    console.error('Error fetching service fees:', error);
    return NextResponse.json({ 
      error: '봉사금 내역을 가져오는데 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}