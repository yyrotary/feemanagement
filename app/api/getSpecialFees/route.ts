import { NextResponse } from 'next/server';
import { notionClient } from '@/lib/notion';
import { DATABASE_IDS } from '@/lib/notion';
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

interface NotionSpecialFeeProperties {
  name: {
    title: Array<{
      plain_text: string;
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
    select: {
      name: string;
    };
  };
  event: {
    relation: Array<{
      id: string;
    }>;
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { error: '회원 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const response = await notionClient.databases.query({
      database_id: DATABASE_IDS.SPECIAL_FEES,
      filter: {
        property: 'name',
        title: {
          equals: memberId,
        },
      },
      sorts: [
        {
          property: 'date',
          direction: 'descending',
        },
      ],
    });

    const fees = response.results.map((page: PageObjectResponse) => {
      const props = page.properties as NotionSpecialFeeProperties;
      return {
        id: page.id,
        amount: props.paid_fee.number,
        date: props.date.date.start,
        method: props.method.select.name,
        eventId: props.event.relation[0]?.id || '',
      };
    });

    return NextResponse.json(fees);
  } catch (error) {
    console.error('Error fetching special fees:', error);
    return NextResponse.json(
      { error: '특별회비 정보를 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 