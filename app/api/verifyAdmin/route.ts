import { NextResponse } from 'next/server';
import { notion } from '@/lib/notion';

const MASTER_DB_ID = '1c57c9ec930b803785d5d88539c20a21';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    const response = await notion.databases.query({
      database_id: MASTER_DB_ID,
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