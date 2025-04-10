import { NextRequest, NextResponse } from 'next/server';
import { notionClient } from '@/lib/notion';

interface UpdateMasterInfoRequest {
  id: string;
  exchange_rate?: number;
  specialevent_fee?: number;
  pass?: string;
  sdonation?: number;
  // 필요한 다른 필드들 추가 가능
}

export async function POST(request: NextRequest) {
  try {
    const { id, exchange_rate, specialevent_fee, pass, sdonation } = await request.json() as UpdateMasterInfoRequest;

    if (!id) {
      return NextResponse.json({ error: '업데이트할 페이지 ID가 필요합니다.' }, { status: 400 });
    }

    // 업데이트할 속성 객체 생성
    type NotionPropertyValue = 
      | { number: number }
      | { rich_text: Array<{ text: { content: string } }> };
    
    const properties: Record<string, NotionPropertyValue> = {};

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

    if (pass !== undefined) {
      properties.pass = {
        rich_text: [{ 
          text: { 
            content: pass 
          } 
        }]
      };
    }

    if (sdonation !== undefined) {
      properties.sdonation = {
        number: sdonation
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
      updated: { id, exchange_rate, specialevent_fee, pass, sdonation }
    });
  } catch (error) {
    console.error('Error updating master info:', error);
    return NextResponse.json({ 
      error: '설정 업데이트에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 