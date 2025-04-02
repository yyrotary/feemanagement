import { NextResponse } from 'next/server';
import { notionClient } from '@/lib/notion';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recordId } = body;

    if (!recordId) {
      return NextResponse.json({ error: '기록 ID가 필요합니다.' }, { status: 400 });
    }

    await notionClient.pages.update({
      page_id: recordId,
      archived: true
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting special fee:', error);
    return NextResponse.json({ error: '특별회비 삭제 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 