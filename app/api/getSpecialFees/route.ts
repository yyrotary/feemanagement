import { NextResponse } from 'next/server';
import { notionClient, DATABASE_IDS } from '@/lib/notion';
import {
  PageObjectResponse,
  PartialPageObjectResponse,
  DatabaseObjectResponse,
  PartialDatabaseObjectResponse
} from '@notionhq/client/build/src/api-endpoints';
import NodeCache from 'node-cache';

// 메모리 캐시 설정 (TTL: 10분)
const cache = new NodeCache({ stdTTL: 600 });

interface NotionFeeProperties {
  name: {
    relation: Array<{
      id: string;
    }>;
  };
  paid_fee: {
    number: number;
  };
  date: {
    date: {
      start: string;
    };
  };
  method: {
    multi_select: Array<{
      name: string;
    }>;
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
    const memberId = searchParams.get('memberId');
    
    if (!memberId) {
      return NextResponse.json(
        { error: '회원 ID가 필요합니다' },
        { status: 400 }
      );
    }
    
    // 캐시 키 생성
    const cacheKey = `special_fees_${memberId}`;
    
    // 캐시 확인
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log('Serving from cache:', cacheKey);
      return NextResponse.json({ fees: cachedData });
    }
    
    // 특별회비 데이터 조회
    const response = await notionClient.databases.query({
      database_id: DATABASE_IDS.SPECIAL_FEES,
      filter: {
        property: 'name',
        relation: {
          contains: memberId,
        },
      },
      sorts: [
        {
          property: 'date',
          direction: 'descending',
        },
      ],
    });
    
    // 이벤트 ID 수집 (배치 처리용)
    const eventIds = new Set<string>();
    
    response.results.forEach((page) => {
      if (isFullPage(page)) {
        const properties = page.properties as unknown as NotionFeeProperties;
        if (properties.name?.relation?.length > 0) {
          eventIds.add(properties.name.relation[0].id);
        }
      }
    });
    
    // 이벤트/회원 정보 일괄 조회
    const eventInfoMap = new Map();
    
    if (eventIds.size > 0) {
      const eventDataPromises = Array.from(eventIds).map(id => 
        notionClient.pages.retrieve({ page_id: id })
      );
      
      const eventResults = await Promise.all(eventDataPromises);
      
      eventResults.forEach(event => {
        if (isFullPage(event)) {
          const props = event.properties as unknown as NotionMemberProperties;
          const name = props.Name?.title?.[0]?.plain_text || '이름 없음';
          eventInfoMap.set(event.id, { name });
        }
      });
    }
    
    // 특별회비 데이터 처리 (이제 추가 API 호출 없음)
    const fees = response.results
      .filter(isFullPage)
      .map((page) => {
        const properties = page.properties as unknown as NotionFeeProperties;
        
        let eventId = '';
        let eventName = '';
        
        // 캐시된 이벤트 정보 활용
        if (properties.name?.relation?.length > 0) {
          eventId = properties.name.relation[0].id;
          const eventInfo = eventInfoMap.get(eventId);
          if (eventInfo) {
            eventName = eventInfo.name;
          } else {
            eventName = '행사';
          }
        } else {
          eventName = '행사';
        }
        
        const amount = properties.paid_fee?.number || 0;
        const date = properties.date?.date?.start || '';
        const methods = properties.method?.multi_select?.map(m => m.name) || ['cash'];
        
        return {
          id: page.id,
          amount,
          date,
          eventName,
          method: methods,
        };
      });
    
    // 결과를 캐시에 저장
    cache.set(cacheKey, fees);
    
    return NextResponse.json({ fees });
  } catch (error) {
    console.error('Error fetching special fees:', error);
    return NextResponse.json({
      error: '특별회비 내역을 가져오는데 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
