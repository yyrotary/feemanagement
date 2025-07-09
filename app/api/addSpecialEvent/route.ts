import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { memberId, memberName, nickname, date, eventType } = await request.json();

    // 필수 필드 검증
    if (!memberId || !memberName || !date || !eventType) {
      return NextResponse.json({ 
        error: '회원, 날짜, 경조사 종류는 필수 입력 항목입니다.' 
      }, { status: 400 });
    }

    // 날짜 형식 검증
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json({ 
        error: '올바른 날짜 형식이 아닙니다.' 
      }, { status: 400 });
    }

    // 회원 존재 확인
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, name, nickname')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ 
        error: '존재하지 않는 회원입니다.' 
      }, { status: 400 });
    }

    // 경조사 종류 유효성 검증
    const { data: eventTypesData, error: eventTypesError } = await supabase
      .from('master_info')
      .select('value')
      .eq('key', 'event_types')
      .single();

    const defaultEventTypes = [
      '결혼', '출산', '장례', '병문안', '회갑', '진갑', '칠순', '팔순', '기타'
    ];

    let validEventTypes = defaultEventTypes;
    if (eventTypesData?.value) {
      try {
        const parsedTypes = JSON.parse(eventTypesData.value);
        validEventTypes = Array.isArray(parsedTypes) ? parsedTypes : defaultEventTypes;
      } catch (parseError) {
        validEventTypes = defaultEventTypes;
      }
    }

    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json({ 
        error: '올바르지 않은 경조사 종류입니다.' 
      }, { status: 400 });
    }

    // 중복 경조사 확인 (같은 회원, 같은 날짜, 같은 종류)
    const { data: existingEvent, error: duplicateError } = await supabase
      .from('special_events')
      .select('id')
      .eq('member_id', memberId)
      .eq('date', date)
      .eq('event_type', eventType)
      .single();

    if (existingEvent) {
      return NextResponse.json({ 
        error: '이미 등록된 경조사입니다.' 
      }, { status: 400 });
    }

    // 경조사 이벤트 추가
    const { data: newEvent, error: insertError } = await supabase
      .from('special_events')
      .insert({
        member_id: memberId,
        member_name: memberName,
        nickname: nickname || null,
        date: date,
        event_type: eventType
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      message: '경조사가 성공적으로 추가되었습니다.',
      event: newEvent
    });

  } catch (error) {
    console.error('Error adding special event:', error);
    return NextResponse.json({ 
      error: '경조사 추가에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 