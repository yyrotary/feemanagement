import { NextResponse } from 'next/server';
import { notionClient, DATABASE_IDS } from '@/lib/notion';
import {
  PageObjectResponse,
  QueryDatabaseParameters
} from '@notionhq/client/build/src/api-endpoints';
import NodeCache from 'node-cache';

// 메모리 캐시 설정 (TTL: 2시간으로 확장)
const cache = new NodeCache({ stdTTL: 7200, checkperiod: 600 });

interface NotionEventProperties {
  Name: {
    title: Array<{
      plain_text: string;
    }>;
  };
  Date: {
    date: {
      start: string;
    };
  };
  events?: {
    multi_select: Array<{
      name: string;
    }>;
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberName = searchParams.get('memberName');
    const pageSize = Number(searchParams.get('pageSize') || '20'); // 기본값 20개
    
    // 캐시 키 생성
    const cacheKey = `special_events${memberName ? `_${memberName}` : ''}_${pageSize}`;
    
    // 캐시 확인 (응답 헤더에 캐시 상태 표시)
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      const response = NextResponse.json({ events: cachedData });
      response.headers.set('X-Cache', 'HIT');
      return response;
    }
    
    // 쿼리 옵션 설정 (페이지네이션 적용)
    const queryOptions: QueryDatabaseParameters = {
      database_id: DATABASE_IDS.SPECIAL_EVENTS,
      page_size: pageSize,
      sorts: [
        {
          property: 'Date',
          direction: 'descending'
        }
      ]
    };
    
    // memberName이 있는 경우 서버 측 필터링 적용
    if (memberName) {
      queryOptions.filter = {
        property: 'Name',
        title: {
          contains: memberName
        }
      };
    }
    
    // API 호출 시간 측정
    const startTime = Date.now();
    
    // Notion API 요청
    const response = await notionClient.databases.query(queryOptions);
    
    const apiTime = Date.now() - startTime;
    console.log(`Notion API 응답 시간: ${apiTime}ms`);
    
    // 결과 처리 (필요한 데이터만 추출)
    const events = response.results
      .filter((page): page is PageObjectResponse => 'properties' in page)
      .map((page) => {
        const properties = page.properties as unknown as NotionEventProperties;
        
        return {
          id: page.id,
          name: properties.Name?.title?.[0]?.plain_text || '',
          date: properties.Date?.date?.start || '',
          eventTypes: properties.events?.multi_select?.map(item => item.name) || [],
        };
      });
    
    // 결과를 캐시에 저장 (2시간)
    cache.set(cacheKey, events);
    
    // 응답 헤더에 캐시 상태 표시
    const jsonResponse = NextResponse.json({ events });
    jsonResponse.headers.set('X-Cache', 'MISS');
    jsonResponse.headers.set('X-API-Time', `${apiTime}ms`);
    
    return jsonResponse;
  } catch (error) {
    console.error('Error fetching special events:', error);
    return NextResponse.json({
      error: '특별 경조사 목록을 가져오는데 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
