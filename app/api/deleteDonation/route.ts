import { NextResponse } from 'next/server';
import { notionClient } from '@/lib/notion';

export async function POST(request: Request) {
  try {
    const { recordId } = await request.json();
    
    console.log('Attempting to delete donation record:', recordId);

    const response = await notionClient.pages.update({
      page_id: recordId,
      archived: true,
      properties: {} // 빈 properties 객체 추가
    });

    console.log('Delete response:', response);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting donation record:', error);
    return NextResponse.json({ 
      error: '기부 기록 삭제에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 