import { NextResponse } from 'next/server';
import { notionClient, DATABASE_IDS, DEFAULT_SPECIAL_EVENT_FEE } from '@/lib/notion';
import { 
  PageObjectResponse,
  PartialPageObjectResponse,
  DatabaseObjectResponse,
  PartialDatabaseObjectResponse
} from '@notionhq/client/build/src/api-endpoints';

interface NotionMasterInfoProperties {
  specialevent_fee: {
    number: number;
  };
}

interface NotionEventProperties {
  name: {
    relation: Array<{
      id: string;
    }>;
  };
  date: {
    date: {
      start: string;
    };
  };
  events: {
    multi_select: Array<{
      name: string;
    }>;
  };
  nick: {
    rollup: {
      array: Array<{
        rich_text: Array<{
          plain_text: string;
        }>;
      }>;
    };
  };
}

interface NotionMemberProperties {
  Name: {
    title: Array<{
      plain_text: string;
    }>;
  };
}

type NotionPage = PageObjectResponse | PartialPageObjectResponse | DatabaseObjectResponse | PartialDatabaseObjectResponse;

function isFullPage(page: NotionPage): page is PageObjectResponse {
  return 'properties' in page;
}

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

    // 마스터 정보에서 특별회비 금액 조회
    const masterInfoResponse = await notionClient.databases.query({
      database_id: DATABASE_IDS.MASTER_INFO,
    });

    // 안전하게 타입 처리
    const firstResult = masterInfoResponse.results[0];
    if (!firstResult || !isFullPage(firstResult)) {
      throw new Error('Invalid response from Notion API');
    }
    const properties = firstResult.properties as unknown as NotionMasterInfoProperties;
    const specialEventFee = properties?.specialevent_fee?.number || DEFAULT_SPECIAL_EVENT_FEE;

    // 결과 매핑 시 안전하게 타입 처리
    const events = await Promise.all(eventsResponse.results.map(async (page) => {
      if (!isFullPage(page)) {
        throw new Error('Invalid page object from Notion API');
      }
      const pageProperties = page.properties as unknown as NotionEventProperties;
      
      // 회원 정보 조회
      const memberId = pageProperties.name?.relation?.[0]?.id;
      let memberNameFromDb = '';
      
      if (memberId) {
        const memberResponse = await notionClient.pages.retrieve({ page_id: memberId });
        if (!isFullPage(memberResponse)) {
          throw new Error('Invalid member response from Notion API');
        }
        const memberProperties = memberResponse.properties as unknown as NotionMemberProperties;
        memberNameFromDb = memberProperties.Name?.title?.[0]?.plain_text || '';
      }

      const date = pageProperties.date?.date?.start || '';
      const eventsList = pageProperties.events?.multi_select?.map(item => item.name) || [];
      const events = eventsList.join(', ');
      const isPersonal = memberName ? memberNameFromDb === memberName : false;
      const nickname = pageProperties.nick?.rollup?.array[0]?.rich_text[0]?.plain_text || '';
      
      return {
        id: page.id,
        name: memberNameFromDb,
        nickname,
        date,
        events,
        isPersonal,
      };
    }));

    // 본인 경조사가 아닌 이벤트만 필터링
    const payableEvents = events.filter(event => !event.isPersonal);
    const totalFee = payableEvents.length * specialEventFee;

    return NextResponse.json({
      events: payableEvents,
      totalFee,
      specialEventFee,
    });
  } catch (error) {
    console.error('Error calculating special fee:', error);
    return NextResponse.json({ 
      error: '특별회비 계산 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 