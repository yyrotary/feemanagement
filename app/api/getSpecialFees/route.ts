import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const rotaryYear = searchParams.get('rotaryYear') || 'current';

    console.log('getSpecialFees API 호출됨:', { memberId, rotaryYear });

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

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
    
    console.log('Rotary year date range for special fees:', startDate, 'to', endDate);

    // 먼저 회원 정보 조회
    const { data: memberInfo, error: memberError } = await supabase
      .from('members')
      .select('id, name, nickname')
      .eq('id', memberId)
      .single();

    if (memberError) {
      console.error('Member 조회 에러:', memberError);
    } else {
      console.log('Member 정보:', memberInfo);
    }

    // 해당 회기의 특별 회비 데이터 조회 (날짜 범위로 필터링)
    console.log('special_fees 쿼리 실행 중...');
    const { data: fees, error } = await supabase
      .from('special_fees')
      .select(`
        id,
        member_id,
        member_name,
        date,
        amount,
        method,
        created_at
      `)
      .eq('member_id', memberId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      console.error('Special_fees 쿼리 에러:', error);
      throw error;
    }

    console.log('special_fees 조회 결과:', fees);

    // 해당 회기의 special_events 조회
    console.log('special_events 쿼리 실행 중...');
    const { data: events, error: eventsError } = await supabase
      .from('special_events')
      .select('*')
      .eq('member_id', memberId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (eventsError) {
      console.error('Special_events 쿼리 에러:', eventsError);
    }

    console.log('special_events 조회 결과:', events);

    // 날짜 기준으로 이벤트와 매핑
    const formattedFees = fees.map(fee => {
      // 같은 날짜 또는 가장 가까운 날짜의 이벤트 찾기
      let eventName = '';
      if (events && events.length > 0) {
        const matchingEvent = events.find(event => event.date === fee.date);
        if (matchingEvent) {
          eventName = matchingEvent.event_type || '';
        } else {
          // 가장 가까운 날짜의 이벤트 사용
          const sortedEvents = [...events].sort((a, b) => 
            Math.abs(new Date(a.date).getTime() - new Date(fee.date).getTime()) -
            Math.abs(new Date(b.date).getTime() - new Date(fee.date).getTime())
          );
          eventName = sortedEvents[0]?.event_type || '';
        }
      }

      return {
        id: fee.id,
        amount: fee.amount,
        date: fee.date,
        eventName: eventName,
        method: Array.isArray(fee.method) ? fee.method : [fee.method || 'cash'],
        memberName: memberInfo?.name || fee.member_name || '회원',
      };
    });

    console.log('formatted special_fees:', formattedFees);

    return NextResponse.json({ 
      fees: formattedFees,
      rotaryYear: rotaryYear === 'current' ? '25-26' : '24-25',
      dateRange: `${startDate} ~ ${endDate}`
    });
  } catch (error) {
    console.error('Error fetching special fees:', error);
    return NextResponse.json({ 
      error: '특별회비 내역을 가져오는데 실패했습니다.',
      details: JSON.stringify(error, null, 2)
    }, { status: 500 });
  }
} 