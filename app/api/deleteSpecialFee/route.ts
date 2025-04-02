import { NextResponse } from 'next/server';
import { notionClient } from '@/lib/notion';

export async function POST(request: Request) {
  try {
    const { recordId } = await request.json();

    if (!recordId) {
      return NextResponse.json({ error: '기록 ID는 필수입니다.' }, { status: 400 });
    }

    // Notion API를 사용하여 페이지 삭제 (보관 처리)
    await notionClient.pages.update({
      page_id: recordId,
      archived: true
    });

    // 성공 응답 반환
    return NextResponse.json({
      success: true,
      message: '특별회비 기록이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('Error deleting special fee record:', error);
    return NextResponse.json({ 
      error: '특별회비 기록 삭제에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 