import { NextResponse } from 'next/server';
import { notionClient, DATABASE_IDS, DEFAULT_SPECIAL_EVENT_FEE } from '@/lib/notion';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberName = searchParams.get('memberName');

    if (!memberName) {
      return NextResponse.json({ error: 'Member name is required' }, { status: 400 });
    }

    // 특별 경조사 목록 조회
    const eventsResponse = await notionClient.databases.query({
      database_id: DATABASE_IDS.SPECIAL_EVENTS,
      sorts: [
        {
          property: 'date',
          direction: 'descending'
        }
      ]
    });

    // API 응답 로깅
    console.log('Notion API Response:', JSON.stringify(eventsResponse.results[0]?.properties, null, 2));

    // 마스터 정보에서 특별회비 금액 조회
    const masterInfoResponse = await notionClient.databases.query({
      database_id: DATABASE_IDS.MASTER_INFO,
    });

    // 안전하게 타입 처리
    const firstResult = masterInfoResponse.results[0] || {};
    const properties = (firstResult as any).properties || {};
    const specialEventFee = properties.specialevent_fee?.number || DEFAULT_SPECIAL_EVENT_FEE;

    // 결과 매핑 시 안전하게 타입 처리
    const events = await Promise.all(eventsResponse.results.map(async (page: any) => {
      const pageProperties = page.properties || {};
      
      // 각 속성 로깅
      console.log('Page Properties:', {
        nameProperty: pageProperties.name,
        dateProperty: pageProperties.date,
        eventsProperty: pageProperties.events
      });
      
      // 회원 정보 조회
      const memberId = pageProperties.name?.relation?.[0]?.id;
      let memberNameFromDb = '';
      
      if (memberId) {
        const memberResponse = await notionClient.pages.retrieve({ page_id: memberId });
        memberNameFromDb = (memberResponse as any).properties?.Name?.title?.[0]?.plain_text || '';
      }

      const date = pageProperties.date?.date?.start || '';
      const eventsList = pageProperties.events?.multi_select?.map((item: any) => item.name) || [];
      const events = eventsList.join(', ');
      const isPersonal = memberName ? memberNameFromDb === memberName : false;

      console.log('Processing event:', { memberNameFromDb, date, events, isPersonal, memberName });
      
      return {
        id: page.id,
        name: memberNameFromDb,
        date,
        events,
        isPersonal,
      };
    }));

    // 본인 경조사가 아닌 이벤트만 필터링
    const payableEvents = events.filter(event => !event.isPersonal);
    const totalFee = payableEvents.length * specialEventFee;

    console.log('Calculation result:', {
      totalEvents: events.length,
      payableEvents: payableEvents.length,
      specialEventFee,
      totalFee
    });

    return NextResponse.json({
      events: payableEvents,
      totalFee,
      specialEventFee,
    });
  } catch (error) {
    console.error('Error calculating special fee:', error);
    return NextResponse.json({ error: 'Failed to calculate special fee' }, { status: 500 });
  }
} 