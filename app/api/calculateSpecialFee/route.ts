import { NextResponse } from 'next/server';
import { notionClient, DATABASE_IDS, DEFAULT_SPECIAL_EVENT_FEE } from '@/lib/notion';
import {
  PageObjectResponse,
  QueryDatabaseParameters
} from '@notionhq/client/build/src/api-endpoints';
import NodeCache from 'node-cache';

// 메모리 캐시 설정 (TTL: 30분)
const cache = new NodeCache({ stdTTL: 1800 });

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

// 타입 가드 함수
function isFullPage(page: any): page is PageObjectResponse {
  return 'properties' in page;
}

export async function GET(request: Request) {
  try {
    const startTime = Date.now();
    const { searchParams } = new URL(request.url);
    const memberName = searchParams.get('memberName');
    
    if (!memberName) {
      return NextResponse.json({ error: '회원 이름이 필요합니다' }, { status: 400 });
    }
    
    // 캐시 키 생성
    const cacheKey = `special_fee_${memberName}`;
    
    // 캐시 확인
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`캐시에서 제공: ${cacheKey}`);
      const response = NextResponse.json(cachedData);
      response.headers.set('X-Cache', 'HIT');
      response.headers.set('X-Response-Time', '0ms');
      return response;
    }
    
    // 병렬로 특별 경조사 목록과 마스터 정보 조회
    const [eventsResponse, masterInfoResponse] = await Promise.all([
      notionClient.databases.query({
        database_id: DATABASE_IDS.SPECIAL_EVENTS,
        sorts: [
          {
            property: 'date',
            direction: 'descending'
          }
        ]
      }),
      notionClient.databases.query({
        database_id: DATABASE_IDS.MASTER_INFO,
      })
    ]);
    
    // 마스터 정보에서 특별회비 금액 추출
    const firstResult = masterInfoResponse.results[0];
    const specialEventFee = isFullPage(firstResult) 
      ? (firstResult.properties as unknown as NotionMasterInfoProperties)?.specialevent_fee?.number || DEFAULT_SPECIAL_EVENT_FEE
      : DEFAULT_SPECIAL_EVENT_FEE;
    
    // 모든 회원 ID 수집 (배치 처리용)
    const memberIds = new Set<string>();
    
    eventsResponse.results.forEach(page => {
      if (isFullPage(page)) {
        const pageProperties = page.properties as unknown as NotionEventProperties;
        if (pageProperties.name?.relation?.[0]?.id) {
          memberIds.add(pageProperties.name.relation[0].id);
        }
      }
    });
    
    // 회원 정보를 한 번에 조회 (배치 처리)
    const memberInfoMap = new Map();
    
    if (memberIds.size > 0) {
      const memberDataPromises = Array.from(memberIds).map(id => 
        notionClient.pages.retrieve({ page_id: id })
      );
      
      const memberResults = await Promise.all(memberDataPromises);
      
      memberResults.forEach(member => {
        if (isFullPage(member)) {
          const memberProperties = member.properties as unknown as NotionMemberProperties;
          const name = memberProperties.Name?.title?.[0]?.plain_text || '';
          memberInfoMap.set(member.id, { name });
        }
      });
    }
    
    // 이벤트 데이터 처리 (이제 추가 API 호출 없음)
    const events = eventsResponse.results
      .filter(isFullPage)
      .map(page => {
        const pageProperties = page.properties as unknown as NotionEventProperties;
        
        // 회원 정보 맵핑
        let memberNameFromDb = '';
        const memberId = pageProperties.name?.relation?.[0]?.id;
        
        if (memberId) {
          const memberInfo = memberInfoMap.get(memberId);
          if (memberInfo) {
            memberNameFromDb = memberInfo.name;
          }
        }
        
        const date = pageProperties.date?.date?.start || '';
        const eventsList = pageProperties.events?.multi_select?.map(item => item.name) || [];
        const eventsStr = eventsList.join(', ');
        const isPersonal = memberName ? memberNameFromDb === memberName : false;
        const nickname = pageProperties.nick?.rollup?.array?.[0]?.rich_text?.[0]?.plain_text || '';
        
        return {
          id: page.id,
          name: memberNameFromDb,
          nickname,
          date,
          events: eventsStr,
          isPersonal,
        };
      });
    
    // 본인 경조사가 아닌 이벤트만 필터링
    const payableEvents = events.filter(event => !event.isPersonal);
    const totalFee = payableEvents.length * specialEventFee;
    
    // 응답 데이터
    const responseData = {
      events: payableEvents,
      totalFee,
      specialEventFee,
    };
    
    // 결과를 캐시에 저장
    cache.set(cacheKey, responseData);
    
    // 응답 시간 계산
    const responseTime = Date.now() - startTime;
    console.log(`특별회비 계산 완료: ${responseTime}ms`);
    
    // 응답 헤더에 성능 정보 추가
    const response = NextResponse.json(responseData);
    response.headers.set('X-Cache', 'MISS');
    response.headers.set('X-Response-Time', `${responseTime}ms`);
    
    return response;
  } catch (error) {
    console.error('특별회비 계산 오류:', error);
    return NextResponse.json({
      error: '특별회비 계산 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
