import { NextResponse } from 'next/server';
import { notion } from '@/lib/notion';
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

interface NotionProperties {
  yyrotary: {
    type: 'relation';
    relation: Array<{ id: string }>;
  };
  date: {
    type: 'date';
    date: {
      start: string;
    };
  };
  paid: {
    type: 'number';
    number: number;
  };
  method: {
    type: 'multi_select';
    multi_select: Array<{ name: string }>;
  };
}

interface NotionMemberProperties {
  Name: {
    type: 'title';
    title: Array<{
      plain_text: string;
    }>;
  };
}

const SERVICE_FEE_DB_ID = '1c47c9ec930b805fa2afe3716f9d7544';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    if (!date) return NextResponse.json({ error: '날짜 필요' }, { status: 400 });

    const response = await notion.databases.query({
      database_id: SERVICE_FEE_DB_ID,
      filter: {
        and: [
          {
            property: 'date',
            date: { on_or_after: date }
          },
          {
            property: 'date',
            date: { on_or_before: date }
          }
        ]
      },
      page_size: 100
    });

    const fees = await Promise.all(response.results.map(async (page) => {
      try {
        const pageObj = page as PageObjectResponse;
        const properties = pageObj.properties as unknown as NotionProperties;
        
        const memberId = properties.yyrotary?.relation[0]?.id;
        let memberName = '';

        if (memberId) {
          const memberPage = await notion.pages.retrieve({ page_id: memberId });
          const memberProperties = (memberPage as PageObjectResponse).properties as unknown as NotionMemberProperties;
          memberName = memberProperties.Name.title[0]?.plain_text || '';
        }

        return {
          id: pageObj.id,
          memberId,
          memberName,
          amount: properties.paid?.number || 0,
          method: (properties.method?.multi_select[0]?.name || '').toLowerCase() as 'cash' | 'card' | 'deposit',
          date: properties.date?.date?.start || date
        };
      } catch (error) {
        console.error('Error processing record:', error);
        return null;
      }
    }));

    return NextResponse.json(fees.filter(Boolean));
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: '로드 실패' }, { status: 500 });
  }
}