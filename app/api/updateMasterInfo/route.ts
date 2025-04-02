import { NextResponse } from 'next/server';
import { notionClient } from '@/lib/notion';
import { PageObjectResponse, UpdatePageParameters } from '@notionhq/client/build/src/api-endpoints';

interface NotionProperty {
  type: 'title' | 'rich_text' | 'number';
  title?: Array<{ plain_text: string }>;
  rich_text?: Array<{ plain_text: string }>;
  number?: number;
}

export async function PUT(request: Request) {
  try {
    const { id, fieldName, value } = await request.json();

    if (!id || !fieldName || !value) {
      return NextResponse.json(
        { error: 'ID, 필드명, 값은 필수 입력 항목입니다.' },
        { status: 400 }
      );
    }

    // 페이지 정보를 먼저 가져와서 필드 타입 확인
    const page = (await notionClient.pages.retrieve({ page_id: id })) as PageObjectResponse;
    const property = page.properties[fieldName] as NotionProperty;

    if (!property) {
      return NextResponse.json(
        { error: '해당 필드를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 필드 타입에 따라 업데이트 객체 생성
    let properties: UpdatePageParameters['properties'] = {};

    if (property.type === 'title') {
      properties[fieldName] = {
        title: [{ text: { content: value } }]
      };
    } else if (property.type === 'rich_text') {
      properties[fieldName] = {
        rich_text: [{ text: { content: value } }]
      };
    } else if (property.type === 'number') {
      const numberValue = parseFloat(value);
      if (isNaN(numberValue)) {
        return NextResponse.json(
          { error: '숫자 형식이 올바르지 않습니다.' },
          { status: 400 }
        );
      }
      properties[fieldName] = {
        number: numberValue
      };
    }

    await notionClient.pages.update({
      page_id: id,
      properties,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating master info:', error);
    return NextResponse.json(
      { error: '기본 정보 업데이트에 실패했습니다.' },
      { status: 500 }
    );
  }
} 