import { NextResponse } from 'next/server';
import { notionClient } from '@/lib/notion';
import { DATABASE_IDS } from '@/lib/notion';
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

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
    let filter: any;
    
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
    } else {
      // 모든 기부 내역 조회 (날짜 정렬)
      filter = undefined;
    }

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

    const donations = await Promise.all(response.results.map(async (page) => {
      const properties = (page as PageObjectResponse).properties as unknown as NotionDonationProperties;
      
      let memberName = '회원';
      let memberId = '';
      
      // 회원 정보 가져오기 (relation 필드가 비어있지 않은 경우에만)
      if (properties.name.relation && properties.name.relation.length > 0) {
        try {
          const memberResponse = await notionClient.pages.retrieve({
            page_id: properties.name.relation[0].id,
          });
          
          memberId = properties.name.relation[0].id;
          const memberProperties = (memberResponse as PageObjectResponse).properties as unknown as NotionMemberProperties;
          
          // 대소문자를 확인하여 'Name' 또는 'name' 속성 접근
          if (memberProperties.Name && memberProperties.Name.title && memberProperties.Name.title.length > 0) {
            memberName = memberProperties.Name.title[0].plain_text;
          } else if (memberProperties['name'] && memberProperties['name'].title && memberProperties['name'].title.length > 0) {
            // @ts-ignore
            memberName = memberProperties['name'].title[0].plain_text;
          }
        } catch (error) {
          console.error('Error fetching member info:', error);
          // 기본값은 이미 설정되어 있음
        }
      }

      return {
        id: page.id,
        date: properties.date.date.start,
        paid_fee: properties.paid_fee.number,
        class: properties.class.multi_select.map(item => item.name),
        method: properties.method.multi_select.map(item => item.name),
        memberId,
        memberName
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