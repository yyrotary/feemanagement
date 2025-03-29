import { NextResponse } from 'next/server';
import { notionClient, DATABASE_IDS } from '@/lib/notion';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    const response = await notionClient.databases.query({
      database_id: DATABASE_IDS.SPECIAL_FEES,
      filter: {
        property: 'name',
        relation: {
          contains: memberId,
        },
      },
    });

    const fees = response.results.map((page: any) => {
      // 회원 정보 페이지에서 이름 가져오기
      const nameRelation = page.properties?.name?.relation?.[0];
      const amount = page.properties?.paid_fee?.number || 0;
      const date = page.properties?.date?.date?.start || '';
      const method = page.properties?.method?.select?.name?.toLowerCase() || 'cash';

      return {
        id: page.id,
        amount,
        date,
        eventName: nameRelation ? nameRelation.id : '',  // 임시로 ID 저장
        method,
      };
    });

    // 회원 이름 가져오기
    const feePromises = fees.map(async (fee) => {
      if (fee.eventName) {
        const memberPage = await notionClient.pages.retrieve({ page_id: fee.eventName });
        const memberName = (memberPage as any).properties?.Name?.title?.[0]?.plain_text || '';
        return {
          ...fee,
          eventName: memberName,
        };
      }
      return fee;
    });

    const feesWithNames = await Promise.all(feePromises);

    return NextResponse.json({ fees: feesWithNames });
  } catch (error) {
    console.error('Error fetching special fees:', error);
    return NextResponse.json({ error: 'Failed to fetch special fees' }, { status: 500 });
  }
} 