import { NextRequest, NextResponse } from 'next/server';
import { notionClient, DATABASE_IDS } from '@/lib/notion';

interface UpdateMasterInfoRequest {
  id: string;
  exchange_rate?: number;
  specialevent_fee?: number;
  // 필요한 다른 필드들 추가 가능
}

export async function POST(request: NextRequest) {
  try {
    const { id, exchange_rate, specialevent_fee } = await request.json() as UpdateMasterInfoRequest;

    if (!id) {
      return NextResponse.json({ error: '업데이트할 페이지 ID가 필요합니다.' }, { status: 400 });
    }

    // 업데이트할 속성 객체 생성
    const properties: Record<string, any> = {};

    if (exchange_rate !== undefined) {
      properties.exchange_rate = {
        number: exchange_rate
      };
    }

    if (specialevent_fee !== undefined) {
      properties.specialevent_fee = {
        number: specialevent_fee
      };
    }

    // 페이지 업데이트
    await notionClient.pages.update({
      page_id: id,
      properties
    });

    return NextResponse.json({ 
      success: true,
      message: '설정이 성공적으로 업데이트되었습니다.',
      updated: { id, exchange_rate, specialevent_fee }
    });
  } catch (error) {
    console.error('Error updating master info:', error);
    return NextResponse.json({ 
      error: '설정 업데이트에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 