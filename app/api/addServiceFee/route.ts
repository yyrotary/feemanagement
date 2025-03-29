import { NextResponse } from 'next/server';
import { notion } from '@/lib/notion';

const SERVICE_FEE_DB_ID = '1c47c9ec930b805fa2afe3716f9d7544';

export async function POST(request: Request) {
  try {
    const { date, memberId, amount, method } = await request.json();

    // Notion API를 사용하여 새 페이지 생성
    const response = await notion.pages.create({
      parent: {
        database_id: SERVICE_FEE_DB_ID
      },
      properties: {
        // yyrotary 관계형 필드 설정
        yyrotary: {
          relation: [
            {
              id: memberId
            }
          ]
        },
        date: {
          date: {
            start: date
          }
        },
        paid: {
          number: amount
        },
        method: {
          multi_select: [
            {
              name: method
            }
          ]
        }
      }
    });

    // 생성된 페이지의 ID를 반환
    return NextResponse.json({
      id: response.id,
      success: true
    });
  } catch (error) {
    console.error('Error adding service fee:', error);
    return NextResponse.json({ 
      error: '봉사금 기록에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}