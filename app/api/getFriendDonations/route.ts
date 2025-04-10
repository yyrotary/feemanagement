import { NextResponse } from 'next/server';
import { notionClient, DATABASE_IDS } from '@/lib/notion';
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

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

  try {
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

    const donations = await Promise.all(response.results.map(async (page) => {
      const properties = (page as PageObjectResponse).properties as unknown as NotionDonationProperties;
      
      // 회원 이름 가져오기 (실제 기부한 회원)
      let memberId = '';
      let memberName = '';
      
      if (properties.name && properties.name.relation.length > 0) {
        memberId = properties.name.relation[0].id;
        
        try {
          const memberResponse = await notionClient.pages.retrieve({ page_id: memberId });
          const memberProps = (memberResponse as PageObjectResponse).properties as unknown as NotionMemberProperties;
          
          // 타입 안전하게 회원 이름 가져오기
          if (memberProps.Name?.title && memberProps.Name.title.length > 0) {
            memberName = memberProps.Name.title[0].plain_text || '회원';
          } else {
            memberName = '회원';
          }
        } catch (err) {
          console.error('Error fetching member data:', err);
          memberName = '회원';
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
    console.error('Error fetching friend donations:', error);
    return NextResponse.json(
      { error: '우정기부 내역을 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 