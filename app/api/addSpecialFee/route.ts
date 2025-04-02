import { NextResponse } from 'next/server';
import { notionClient, DATABASE_IDS } from '@/lib/notion';

export async function POST(request: Request) {
  try {
    const { date, memberId, amount, method } = await request.json();

    // Notion API를 사용하여 새 페이지 생성
    const response = await notionClient.pages.create({
      parent: {
        database_id: DATABASE_IDS.SPECIAL_FEES
      },
      properties: {
        // 관계형 필드 설정
        name: {
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
        paid_fee: {
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
    console.error('Error adding special fee:', error);
    return NextResponse.json({ 
      error: '특별회비 기록에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 