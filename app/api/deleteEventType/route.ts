import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(request: Request) {
  try {
    const { eventType } = await request.json();

    if (!eventType || typeof eventType !== 'string') {
      return NextResponse.json({ error: '삭제할 경조사 종류를 선택해주세요.' }, { status: 400 });
    }

    const trimmedEventType = eventType.trim();
    if (trimmedEventType.length === 0) {
      return NextResponse.json({ error: '삭제할 경조사 종류를 선택해주세요.' }, { status: 400 });
    }

    // 현재 경조사 종류 목록 조회
    const { data: eventTypesData, error: fetchError } = await supabase
      .from('master_info')
      .select('value')
      .eq('key', 'event_types')
      .single();

    // 기본 경조사 종류 목록
    const defaultEventTypes = [
      '결혼',
      '출산',
      '장례',
      '병문안',
      '회갑',
      '진갑',
      '칠순',
      '팔순',
      '기타'
    ];

    let currentEventTypes = defaultEventTypes;

    // 저장된 데이터가 있으면 파싱
    if (eventTypesData?.value) {
      try {
        const parsedTypes = JSON.parse(eventTypesData.value);
        currentEventTypes = Array.isArray(parsedTypes) ? parsedTypes : defaultEventTypes;
      } catch (parseError) {
        console.error('경조사 종류 파싱 에러:', parseError);
        currentEventTypes = defaultEventTypes;
      }
    }

    // 삭제할 경조사 종류가 존재하는지 확인
    if (!currentEventTypes.includes(trimmedEventType)) {
      return NextResponse.json({ error: '존재하지 않는 경조사 종류입니다.' }, { status: 400 });
    }

    // 기본 경조사 종류는 삭제할 수 없음
    if (defaultEventTypes.includes(trimmedEventType)) {
      return NextResponse.json({ error: '기본 경조사 종류는 삭제할 수 없습니다.' }, { status: 400 });
    }

    // 해당 경조사 종류가 사용되고 있는지 확인
    const { data: usedEvents, error: checkError } = await supabase
      .from('special_events')
      .select('id')
      .eq('event_type', trimmedEventType)
      .limit(1);

    if (checkError) {
      throw checkError;
    }

    if (usedEvents && usedEvents.length > 0) {
      return NextResponse.json({ 
        error: '이미 사용 중인 경조사 종류는 삭제할 수 없습니다.' 
      }, { status: 400 });
    }

    // 경조사 종류 삭제
    const updatedEventTypes = currentEventTypes.filter(type => type !== trimmedEventType);

    // 데이터베이스에 저장
    const { error: updateError } = await supabase
      .from('master_info')
      .upsert({
        key: 'event_types',
        value: JSON.stringify(updatedEventTypes),
        description: '경조사 종류 목록'
      }, {
        onConflict: 'key'
      });

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ 
      message: '경조사 종류가 삭제되었습니다.',
      eventTypes: updatedEventTypes 
    });

  } catch (error) {
    console.error('Error deleting event type:', error);
    return NextResponse.json({ 
      error: '경조사 종류 삭제에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 