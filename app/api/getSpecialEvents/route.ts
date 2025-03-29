import { NextResponse } from 'next/server';
import { notionClient, DATABASE_IDS } from '@/lib/notion';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberName = searchParams.get('memberName');

    const response = await notionClient.databases.query({
      database_id: DATABASE_IDS.SPECIAL_EVENTS,
    });

    const events = response.results.map((page: any) => ({
      id: page.id,
      name: page.properties?.Name?.title[0]?.plain_text || '',
      date: page.properties?.Date?.date?.start || '',
      isPersonal: memberName ? page.properties?.Name?.title[0]?.plain_text?.includes(memberName) : false,
    }));

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching special events:', error);
    return NextResponse.json({ error: 'Failed to fetch special events' }, { status: 500 });
  }
}