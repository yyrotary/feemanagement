import { NextResponse } from 'next/server';
import { notionClient, DATABASE_IDS } from '@/lib/notion';
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

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
    select: {
      name: string;
    };
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    const response = await notionClient.databases.query({
      database_id: DATABASE_IDS.SERVICE_FEES,
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

    const fees = response.results.map((page) => {
      const pageObj = page as PageObjectResponse;
      const properties = pageObj.properties as unknown as NotionFeeProperties;

      return {
        id: pageObj.id,
        amount: properties.paid_fee?.number || 0,
        date: properties.date?.date?.start || '',
        method: properties.method?.select?.name?.toLowerCase() || 'cash',
      };
    });

    return NextResponse.json({ fees });
  } catch (error) {
    console.error('Error fetching service fees:', error);
    return NextResponse.json({ 
      error: '봉사금 내역을 가져오는데 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}