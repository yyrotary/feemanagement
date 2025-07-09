import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { eventType } = await request.json();

    if (!eventType || typeof eventType !== 'string') {
      return NextResponse.json({ error: '경조사 종류를 입력해주세요.' }, { status: 400 });
    }

    const trimmedEventType = eventType.trim();
    if (trimmedEventType.length === 0) {
      return NextResponse.json({ error: '경조사 종류를 입력해주세요.' }, { status: 400 });
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

    // 중복 확인
    if (currentEventTypes.includes(trimmedEventType)) {
      return NextResponse.json({ error: '이미 존재하는 경조사 종류입니다.' }, { status: 400 });
    }

    // 새로운 경조사 종류 추가
    const updatedEventTypes = [...currentEventTypes, trimmedEventType];

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
      message: '경조사 종류가 추가되었습니다.',
      eventTypes: updatedEventTypes 
    });

  } catch (error) {
    console.error('Error adding event type:', error);
    return NextResponse.json({ 
      error: '경조사 종류 추가에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 