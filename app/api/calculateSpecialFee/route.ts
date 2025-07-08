import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberName = searchParams.get('memberName');
    const rotaryYear = searchParams.get('rotaryYear') || 'current';

    if (!memberName) {
      return NextResponse.json({ error: 'Member name is required' }, { status: 400 });
    }

    console.log('calculateSpecialFee API 호출됨:', { memberName, rotaryYear });

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
    
    console.log('Rotary year date range for special events:', startDate, 'to', endDate);

    // 해당 회기의 특별 경조사 목록 조회 (날짜 범위로 필터링)
    const { data: events, error: eventsError } = await supabase
      .from('special_events')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (eventsError) {
      throw new Error(`특별 이벤트 조회 실패: ${eventsError.message}`);
    }

    // 마스터 정보에서 특별회비 금액 조회 (key-value 구조)
    const { data: masterInfo, error: masterError } = await supabase
      .from('master_info')
      .select('value')
      .eq('key', 'special_event_fee')
      .single();

    if (masterError) {
      throw new Error(`마스터 정보 조회 실패: ${masterError.message}`);
    }

    const specialEventFee = masterInfo?.value ? parseInt(masterInfo.value) : 20000; // 기본값 20,000원

    // member_name이 비어있는 경우를 위해 모든 회원 정보를 조회
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, name');

    if (membersError) {
      throw new Error(`회원 정보 조회 실패: ${membersError.message}`);
    }

    // 회원 ID와 이름 매핑
    const memberMap = new Map();
    members?.forEach(member => {
      memberMap.set(member.id, member.name);
    });

    // 이벤트 데이터 매핑
    const mappedEvents = events?.map(event => {
      // member_name이 비어있으면 member_id로 실제 이름 조회
      const actualMemberName = event.member_name || memberMap.get(event.member_id) || '';
      
      return {
        id: event.id,
        name: actualMemberName,
        nickname: event.nickname || '',
        date: event.date || '',
        events: event.event_type || '',
        isPersonal: actualMemberName === memberName,
      };
    }) || [];

    // 본인 경조사가 아닌 이벤트만 필터링
    const payableEvents = mappedEvents.filter(event => !event.isPersonal);
    const totalFee = payableEvents.length * specialEventFee;

    return NextResponse.json({
      events: payableEvents,
      totalFee,
      specialEventFee,
      rotaryYear: rotaryYear === 'current' ? '25-26' : '24-25',
      dateRange: `${startDate} ~ ${endDate}`
    });
  } catch (error) {
    console.error('Error calculating special fee:', error);
    return NextResponse.json({ 
      error: '특별회비 계산 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 