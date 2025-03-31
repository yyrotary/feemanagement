import { NextResponse } from 'next/server';
import { notionClient } from '@/lib/notion';
import { DATABASE_IDS } from '@/lib/notion';
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

interface NotionDonationProperties {
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
  class: {
    multi_select: Array<{
      name: string;
    }>;
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
  nick: {
    rich_text: Array<{
      plain_text: string;
    }>;
  };
}
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('memberId');

  if (!memberId) {
    return NextResponse.json({ error: '회원 ID가 필요합니다.' }, { status: 400 });
  }

  try {
    const response = await notionClient.databases.query({
      database_id: DATABASE_IDS.DONATIONS,
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

    const donations = await Promise.all(response.results.map(async (page) => {
      const properties = (page as PageObjectResponse).properties as unknown as NotionDonationProperties;
      
      // 회원 정보 가져오기
      const memberResponse = await notionClient.pages.retrieve({
        page_id: properties.name.relation[0].id,
      });
      //const memberProperties = (memberResponse as PageObjectResponse).properties as unknown as NotionMemberProperties;

      return {
        id: page.id,
        date: properties.date.date.start,
        paid_fee: properties.paid_fee.number,
        class: properties.class.multi_select.map(item => item.name),
        method: properties.method.multi_select.map(item => item.name),
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