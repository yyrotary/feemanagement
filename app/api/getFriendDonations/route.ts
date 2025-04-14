import { NextResponse } from 'next/server';
import { notionClient, DATABASE_IDS } from '@/lib/notion';
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import NodeCache from 'node-cache';

// 메모리 캐시 설정 (TTL: 10분)
const cache = new NodeCache({ stdTTL: 600 });

interface NotionDonationProperties {
  date: {
    date: {
      start: string;
    };
  };
  paid_fee: {
    number: number;
  };
  method: {
    multi_select: Array<{
      name: string;
    }>;
  };
  class: {
    multi_select: Array<{
      name: string;
    }>;
  };
  name: {
    relation: Array<{
      id: string;
    }>;
  };
  from_friend: {
    relation: Array<{
      id: string;
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const friendId = searchParams.get('friendId');
  
  if (!friendId) {
    return NextResponse.json(
      { error: '회원 ID가 필요합니다.' },
      { status: 400 }
    );
  }
  
  // 캐시 키 생성
  const cacheKey = `friend_donations_${friendId}`;
  
  try {
    // 캐시 확인
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log('Serving from cache:', cacheKey);
      return NextResponse.json({ donations: cachedData });
    }
    
    // 우정기부 조회 (현재 회원이 from_friend인 기부 내역)
    const response = await notionClient.databases.query({
      database_id: DATABASE_IDS.DONATIONS,
      filter: {
        property: 'from_friend',
        relation: {
          contains: friendId,
        },
      },
      sorts: [
        {
          property: 'date',
          direction: 'descending',
        },
      ],
    });
    
    // 모든 기부자 ID 수집 (배치 처리용)
    const memberIds = new Set<string>();
    
    response.results.forEach((page) => {
      const properties = (page as PageObjectResponse).properties as unknown as NotionDonationProperties;
      if (properties.name?.relation?.length > 0) {
        memberIds.add(properties.name.relation[0].id);
      }
    });
    
    // 회원 정보 한 번에 조회
    const memberInfoMap = new Map();
    
    if (memberIds.size > 0) {
      const memberDataPromises = Array.from(memberIds).map(id => 
        notionClient.pages.retrieve({ page_id: id })
      );
      
      const memberResults = await Promise.all(memberDataPromises);
      
      memberResults.forEach(member => {
        const props = (member as PageObjectResponse).properties as unknown as NotionMemberProperties;
        const name = props.Name?.title?.[0]?.plain_text || '이름 없음';
        memberInfoMap.set(member.id, { name });
      });
    }
    
    // 기부 내역 처리 (이제 추가 API 호출 없음)
    const donations = response.results.map((page) => {
      const properties = (page as PageObjectResponse).properties as unknown as NotionDonationProperties;
      
      let memberId = '';
      let memberName = '';
      
      // 캐시된 회원 정보 활용
      if (properties.name?.relation?.length > 0) {
        memberId = properties.name.relation[0].id;
        const memberInfo = memberInfoMap.get(memberId);
        if (memberInfo) {
          memberName = memberInfo.name;
        } else {
          memberName = '회원';
        }
      } else {
        memberName = '회원';
      }
      
      return {
        id: page.id,
        date: properties.date?.date?.start,
        paid_fee: properties.paid_fee?.number,
        class: properties.class?.multi_select?.map(item => item.name) || [],
        method: properties.method?.multi_select?.map(item => item.name) || [],
        memberId,
        memberName
      };
    });
    
    // 결과를 캐시에 저장
    cache.set(cacheKey, donations);
    
    return NextResponse.json({ donations });
  } catch (error) {
    console.error('Error fetching friend donations:', error);
    return NextResponse.json(
      { error: '우정기부 내역을 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}
