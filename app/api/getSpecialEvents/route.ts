import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberName = searchParams.get('memberName');

    // 특별 이벤트 조회
    const { data: events, error } = await supabase
      .from('special_events')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`특별 이벤트 조회 실패: ${error.message}`);
    }

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

    // 데이터 매핑
    const mappedEvents = events?.map((event) => {
      // member_name이 비어있으면 member_id로 실제 이름 조회
      const actualMemberName = event.member_name || memberMap.get(event.member_id) || '';
      
      return {
        id: event.id,
        name: actualMemberName,
        date: event.date || '',
        eventType: event.event_type || '',
        isPersonal: memberName ? actualMemberName?.includes(memberName) : false,
      };
    }) || [];

    return NextResponse.json({ events: mappedEvents });
  } catch (error) {
    console.error('Error fetching special events:', error);
    return NextResponse.json({ 
      error: '특별 경조사 목록을 가져오는데 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}