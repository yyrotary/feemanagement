import { NextResponse } from 'next/server';
import { notionClient, DATABASE_IDS } from '@/lib/notion';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    const response = await notionClient.databases.query({
      database_id: DATABASE_IDS.MASTER_INFO,
      filter: {
        property: 'pass',
        rich_text: {
          equals: password
        }
      }
    });

    if (response.results.length > 0) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}