import { NextResponse } from 'next/server';
import { notionClient, DATABASE_IDS } from '@/lib/notion';
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { QueryDatabaseParameters } from '@notionhq/client/build/src/api-endpoints';
import { NotionMemberProperties, NotionDonationProperties } from '@/lib/notion-types';
import NodeCache from 'node-cache';

// 메모리 캐시 설정 (TTL: 10분)
const cache = new NodeCache({ stdTTL: 600 });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('memberId');
  const date = searchParams.get('date');
  const cacheKey = memberId ? `member_${memberId}` : `date_${date}`;

  try {
    // 캐시 확인
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log('Serving from cache:', cacheKey);
      return NextResponse.json({ donations: cachedData });
    }

    // 필터 옵션 설정
    let filter: QueryDatabaseParameters['filter'];
    if (memberId) {
      filter = {
        property: 'name',
        relation: {
          contains: memberId,
        },
      };
    } else if (date) {
      filter = {
        property: 'date',
        date: {
          equals: date,
        },
      };
    } else {
      return NextResponse.json(
        { error: '회원 ID 또는 날짜가 필요합니다' },
        { status: 400 }
      );
    }

    // 기부 내역 조회
    const response = await notionClient.databases.query({
      database_id: DATABASE_IDS.DONATIONS,
      filter: filter,
      sorts: [
        {
          property: 'date',
          direction: 'descending',
        },
      ],
    });

    // 관련 회원 ID와 우정 기부 회원 ID 추출
    const memberIds = new Set<string>();
    const friendIds = new Set<string>();

    response.results.forEach((page) => {
      const props = (page as PageObjectResponse).properties as unknown as NotionDonationProperties;
      
      if (props.name?.relation?.length > 0) {
        memberIds.add(props.name.relation[0].id);
      }
      
      if (props.from_friend?.relation?.length > 0) {
        friendIds.add(props.from_friend.relation[0].id);
      }
    });

    // 모든 관련 회원 정보를 한 번에 조회
    const allMemberIds = [...memberIds, ...friendIds];
    const memberInfoMap = new Map();
    
    if (allMemberIds.length > 0) {
      const memberDataPromises = allMemberIds.map(id => 
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
      
      let memberName = '회원';
      let memberId = '';
      let fromFriend = undefined;
      
      // 캐시된 회원 정보 활용
      if (properties.name?.relation?.length > 0) {
        memberId = properties.name.relation[0].id;
        const memberInfo = memberInfoMap.get(memberId);
        if (memberInfo) {
          memberName = memberInfo.name;
        }
      }
      
      // 우정 기부 회원 정보 활용
      if (properties.from_friend?.relation?.length > 0) {
        const friendId = properties.from_friend.relation[0].id;
        const friendInfo = memberInfoMap.get(friendId);
        if (friendInfo) {
          fromFriend = {
            id: friendId,
            name: friendInfo.name
          };
        }
      }
      
      return {
        id: page.id,
        date: properties.date?.date?.start,
        paid_fee: properties.paid_fee?.number,
        class: properties.class?.multi_select?.map(item => item.name) || [],
        method: properties.method?.multi_select?.map(item => item.name) || [],
        memberId,
        memberName,
        from_friend: fromFriend
      };
    });

    // 결과를 캐시에 저장
    cache.set(cacheKey, donations);

    return NextResponse.json({ donations });
  } catch (error) {
    console.error('Error fetching donations:', error);
    return NextResponse.json(
      { error: '기부 내역을 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}
