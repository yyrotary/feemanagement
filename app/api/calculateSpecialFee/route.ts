import { NextResponse } from 'next/server';
import { notionClient, DATABASE_IDS } from '@/lib/notion';

interface NotionResponse {
  results: Array<{
    id: string;
    properties: {
      이름?: {
        title: Array<{
          plain_text: string;
        }>;
      };
      날짜?: {
        date: {
          start: string;
        };
      };
      개인행사여부?: {
        checkbox: boolean;
      };
      특별회비?: {
        number: number;
      };
    };
  }>;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const memberName = searchParams.get('memberName');

  if (!memberName) {
    return NextResponse.json({ error: '회원 이름이 필요합니다.' }, { status: 400 });
  }

  try {
    // 특별 행사 조회
    const eventsResponse = await notionClient.databases.query({
      database_id: DATABASE_IDS.SPECIAL_EVENTS,
      filter: {
        property: 'yyrotary',
        title: {
          equals: memberName
        }
      }
    }) as NotionResponse;

    // 마스터 정보 조회
    const masterResponse = await notionClient.databases.query({
      database_id: DATABASE_IDS.MASTER,
      filter: {
        property: 'yyrotary',
        title: {
          equals: memberName
        }
      }
    }) as NotionResponse;

    // 특별 행사비 금액 가져오기
    const specialEventFee = masterResponse.results[0]?.properties?.특별회비?.number || 20000;

    // 이벤트 매핑
    const events = eventsResponse.results.map(event => ({
      id: event.id,
      name: event.properties?.이름?.title[0]?.plain_text || '',
      date: event.properties?.날짜?.date?.start || '',
      isPersonal: event.properties?.개인행사여부?.checkbox || false
    }));

    // 개인 행사가 아닌 이벤트만 필터링
    const payableEvents = events.filter(event => !event.isPersonal);

    // 총 금액 계산
    const totalFee = payableEvents.length * specialEventFee;

    return NextResponse.json({
      events: payableEvents,
      totalFee,
      specialEventFee
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: '데이터를 가져오는데 실패했습니다.' }, { status: 500 });
  }
} 