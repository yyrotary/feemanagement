import { NextResponse } from 'next/server';
import { notionClient } from '@/lib/notion';
import { DATABASE_IDS } from '@/lib/notion';

interface NotionFeeProperties {
  name: { title: { plain_text: string } };
  paid_fee: { number: number };
  date: { date: { start: string } };
  method: { multi_select: { name: string }[] };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: '날짜가 필요합니다.' }, { status: 400 });
    }

    const response = await notionClient.databases.query({
      database_id: DATABASE_IDS.FEES,
      filter: {
        property: 'date',
        date: {
          equals: date
        }
      },
      sorts: [
        {
          property: 'date',
          direction: 'descending'
        }
      ]
    });

    const fees = response.results.map((page: any) => {
      const properties = page.properties as NotionFeeProperties;
      return {
        id: page.id,
        date: properties.date.date.start,
        paid_fee: properties.paid_fee.number,
        method: properties.method.multi_select.map(m => m.name),
        memberId: properties.name.title[0]?.plain_text || '',
        memberName: properties.name.title[0]?.plain_text || ''
      };
    });

    return NextResponse.json({ fees });
  } catch (error) {
    console.error('Error fetching fees:', error);
    return NextResponse.json({ error: '회비 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 