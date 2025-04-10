import { NextResponse } from 'next/server';
import { notionClient, DATABASE_IDS } from '@/lib/notion';
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

interface NotionMasterInfoProperties {
  exchange_rate: {
    number: number;
  };
  specialevent_fee: {
    number: number;
  };
  pass: {
    rich_text: [{
      plain_text: string;
    }];
  };
  sdonation: {
    number: number;
  };
  // 필요한 다른 필드들 추가 가능
}

export async function GET() {
  try {
    const response = await notionClient.databases.query({
      database_id: DATABASE_IDS.MASTER_INFO,
      page_size: 1,
    });

    if (response.results.length === 0) {
      return NextResponse.json({ error: '마스터 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    const page = response.results[0] as PageObjectResponse;
    const properties = page.properties as unknown as NotionMasterInfoProperties;
    
    // 모든 설정 정보를 응답
    return NextResponse.json({
      id: page.id, // 페이지 ID를 포함해 업데이트할 때 사용
      exchange_rate: properties.exchange_rate?.number || 0,
      specialevent_fee: properties.specialevent_fee?.number || 10000,
      pass: properties.pass?.rich_text[0]?.plain_text || '',
      sdonation: properties.sdonation?.number || 0,
      // 필요한 다른 필드들 추가 가능
    });
  } catch (error) {
    console.error('Error fetching master info:', error);
    return NextResponse.json({ 
      error: '마스터 정보를 가져오는데 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 