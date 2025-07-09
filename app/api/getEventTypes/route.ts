import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // master_info 테이블에서 경조사 종류 목록 조회
    const { data: eventTypesData, error } = await supabase
      .from('master_info')
      .select('value')
      .eq('key', 'event_types')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116은 데이터 없음 에러
      throw error;
    }

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

    let eventTypes = defaultEventTypes;

    // 저장된 데이터가 있으면 파싱
    if (eventTypesData?.value) {
      try {
        const parsedTypes = JSON.parse(eventTypesData.value);
        eventTypes = Array.isArray(parsedTypes) ? parsedTypes : defaultEventTypes;
      } catch (parseError) {
        console.error('경조사 종류 파싱 에러:', parseError);
        // 파싱 에러 시 기본값 사용
        eventTypes = defaultEventTypes;
      }
    }

    return NextResponse.json({ eventTypes });
  } catch (error) {
    console.error('Error fetching event types:', error);
    return NextResponse.json({ 
      error: '경조사 종류 목록을 가져오는데 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 