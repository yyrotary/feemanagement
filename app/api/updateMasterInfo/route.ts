import { NextResponse } from 'next/server';
import { notionClient } from '@/lib/notion';

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
    const page = await notionClient.pages.retrieve({ page_id: id });
    const property = (page as any).properties[fieldName];

    if (!property) {
      return NextResponse.json(
        { error: '해당 필드를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 필드 타입에 따라 업데이트 객체 생성
    const updateData: any = {
      [fieldName]: {}
    };

    if (property.type === 'title') {
      updateData[fieldName] = {
        title: [{ text: { content: value } }]
      };
    } else if (property.type === 'rich_text') {
      updateData[fieldName] = {
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
      updateData[fieldName] = {
        number: numberValue
      };
    }

    await notionClient.pages.update({
      page_id: id,
      properties: updateData,
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