import { NextResponse } from 'next/server';
import { notionClient, DATABASE_IDS } from '@/lib/notion';

interface NotionResponse {
  results: Array<{
    id: string;
    properties: {
      이름?: {
        title: Array<{
          plain_text: string;
        }>;
      };
      날짜?: {
        date: {
          start: string;
        };
      };
      개인행사여부?: {
        checkbox: boolean;
      };
    };
  }>;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberName = searchParams.get('memberName');

    const response = await notionClient.databases.query({
      database_id: DATABASE_IDS.SPECIAL_EVENTS,
      sorts: [
        {
          property: '날짜',
          direction: 'descending'
        }
      ]
    }) as NotionResponse;

    const events = response.results.map(event => ({
      id: event.id,
      name: event.properties?.이름?.title[0]?.plain_text || '',
      date: event.properties?.날짜?.date?.start || '',
      isPersonal: memberName ? event.properties?.이름?.title[0]?.plain_text?.includes(memberName) : false
    }));

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: '데이터를 가져오는데 실패했습니다.' }, { status: 500 });
  }
}