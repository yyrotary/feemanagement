import { NextResponse } from 'next/server';
import { notionClient } from '@/lib/notion';
import { DATABASE_IDS } from '@/lib/notion';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, memberId, paid_fee, method } = body;

    if (!date || !memberId || !paid_fee || !method) {
      return NextResponse.json({ error: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }

    const response = await notionClient.pages.create({
      parent: { database_id: DATABASE_IDS.FEES },
      properties: {
        name: {
          title: [
            {
              text: {
                content: memberId
              }
            }
          ]
        },
        paid_fee: {
          number: paid_fee
        },
        date: {
          date: {
            start: date
          }
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

    return NextResponse.json({ id: response.id });
  } catch (error) {
    console.error('Error adding fee:', error);
    return NextResponse.json({ error: '회비 기록 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 