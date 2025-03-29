import { NextResponse } from 'next/server';
import { notionClient, DATABASE_IDS } from '@/lib/notion';

interface NotionResponse {
  results: Array<{
    id: string;
    properties: {
      날짜?: {
        date: {
          start: string;
        };
      };
      금액?: {
        number: number;
      };
      납부수단?: {
        multi_select: Array<{
          name: string;
        }>;
      };
    };
  }>;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('memberId');

  if (!memberId) {
    return NextResponse.json({ error: '회원 ID가 필요합니다.' }, { status: 400 });
  }

  try {
    const response = await notionClient.databases.query({
      database_id: DATABASE_IDS.SPECIAL_FEES,
      filter: {
        property: 'yyrotary',
        relation: {
          contains: memberId
        }
      },
      sorts: [
        {
          property: '날짜',
          direction: 'descending'
        }
      ]
    }) as NotionResponse;

    const fees = response.results.map(fee => ({
      id: fee.id,
      date: fee.properties?.날짜?.date?.start || '',
      amount: fee.properties?.금액?.number || 0,
      methods: fee.properties?.납부수단?.multi_select.map(method => method.name) || []
    }));

    return NextResponse.json(fees);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: '데이터를 가져오는데 실패했습니다.' }, { status: 500 });
  }
} 