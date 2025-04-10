import { NextResponse } from 'next/server';
import { notionClient } from '@/lib/notion';
import { DONATIONS_DB_ID } from '@/lib/notion';
import { 
  PageObjectResponse,
  QueryDatabaseParameters
} from '@notionhq/client/build/src/api-endpoints';

interface NotionDonationProperties {
  name: {
    relation: { id: string }[];
  };
  date: {
    date: { start: string };
  };
  paid_fee: {
    number: number;
  };
  class: {
    multi_select: { name: string }[];
  };
  method: {
    multi_select: { name: string }[];
  };
  from_friend: {
    relation: { id: string }[];
  };
}

interface NotionMemberProperties {
  Name: {
    title: { plain_text: string }[];
  };
  nickname: {
    rich_text: { plain_text: string }[];
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('memberId');
  const date = searchParams.get('date');

  try {
    // 필터 옵션 설정
    let filter: QueryDatabaseParameters['filter'];
    
    if (memberId) {
      // 특정 회원의 기부 내역 조회
      filter = {
        property: 'name',
        relation: {
          contains: memberId,
        },
      };
    } else if (date) {
      // 특정 날짜의 기부 내역 조회
      filter = {
        property: 'date',
        date: {
          equals: date,
        },
      };
    }

    const response = await notionClient.databases.query({
      database_id: DONATIONS_DB_ID,
      filter: filter,
      sorts: [
        {
          property: 'date',
          direction: 'descending',
        },
      ],
    });

    const donations = await Promise.all(response.results.map(async (page) => {
      const properties = (page as PageObjectResponse).properties as unknown as NotionDonationProperties;
      
      let memberName = '회원';
      let memberId = '';
      let fromFriend = undefined;
      
      // 회원 정보 가져오기 (relation 필드가 비어있지 않은 경우에만)
      if (properties.name.relation && properties.name.relation.length > 0) {
        try {
          const memberResponse = await notionClient.pages.retrieve({
            page_id: properties.name.relation[0].id,
          });
          
          memberId = properties.name.relation[0].id;
          const memberProperties = (memberResponse as PageObjectResponse).properties as unknown as NotionMemberProperties;
          
          if (memberProperties.Name && memberProperties.Name.title && memberProperties.Name.title.length > 0) {
            memberName = memberProperties.Name.title[0].plain_text;
          }
        } catch (error) {
          console.error('Error fetching member info:', error);
        }
      }

      // 우정기부 회원 정보 가져오기
      if (properties.from_friend?.relation && properties.from_friend.relation.length > 0) {
        try {
          const friendResponse = await notionClient.pages.retrieve({
            page_id: properties.from_friend.relation[0].id,
          });
          
          const friendProperties = (friendResponse as PageObjectResponse).properties as unknown as NotionMemberProperties;
          
          if (friendProperties.Name && friendProperties.Name.title && friendProperties.Name.title.length > 0) {
            fromFriend = {
              id: properties.from_friend.relation[0].id,
              name: friendProperties.Name.title[0].plain_text
            };
          }
        } catch (error) {
          console.error('Error fetching friend info:', error);
        }
      }

      return {
        id: page.id,
        date: properties.date.date.start,
        paid_fee: properties.paid_fee.number,
        class: properties.class.multi_select.map(item => item.name),
        method: properties.method.multi_select.map(item => item.name),
        memberId,
        memberName,
        from_friend: fromFriend
      };
    }));

    return NextResponse.json({ donations });
  } catch (error) {
    console.error('Error fetching donations:', error);
    return NextResponse.json(
      { error: '기부 내역을 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 