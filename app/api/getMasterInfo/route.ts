import { NextResponse } from 'next/server';
import { notionClient } from '@/lib/notion';
import { DATABASE_IDS } from '@/lib/notion';
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

interface NotionProperty {
  type: string;
  [key: string]: any;
}

export async function GET() {
  try {
    const response = await notionClient.databases.query({
      database_id: DATABASE_IDS.MASTER_INFO,
      page_size: 1, // 첫 번째 행만 가져옴
    });

    if (response.results.length === 0) {
      return NextResponse.json(
        { error: '기본 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const page = response.results[0] as PageObjectResponse;
    const properties = page.properties;
    
    // 모든 필드를 객체로 변환
    const fields: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(properties)) {
      const prop = value as NotionProperty;
      if (prop.type === 'title' || prop.type === 'rich_text') {
        const textContent = prop[prop.type][0]?.plain_text || '';
        fields[key] = textContent;
      } else if (prop.type === 'number') {
        fields[key] = prop.number?.toString() || '';
      }
    }

    return NextResponse.json({
      id: page.id,
      fields
    });
  } catch (error) {
    console.error('Error details:', error);
    return NextResponse.json(
      { error: '기본 정보를 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
} 