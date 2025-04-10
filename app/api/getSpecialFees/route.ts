import { NextResponse } from 'next/server';
import { notionClient, DATABASE_IDS } from '@/lib/notion';
import { 
  PageObjectResponse,
  PartialPageObjectResponse,
  DatabaseObjectResponse,
  PartialDatabaseObjectResponse
} from '@notionhq/client/build/src/api-endpoints';

interface NotionFeeProperties {
  name: {
    relation: Array<{
      id: string;
    }>;
  };
  paid_fee: {
    number: number;
  };
  date: {
    date: {
      start: string;
    };
  };
  method: {
    multi_select: Array<{
      name: string;
    }>;
  };
}

interface NotionMemberProperties {
  Name: {
    title: Array<{
      plain_text: string;
    }>;
  };
}

type NotionPage = PageObjectResponse | PartialPageObjectResponse | DatabaseObjectResponse | PartialDatabaseObjectResponse;

function isFullPage(page: NotionPage): page is PageObjectResponse {
  return 'properties' in page;
}

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

    const fees = response.results.map((page) => {
      if (!isFullPage(page)) {
        throw new Error('Invalid page object from Notion API');
      }
      const properties = page.properties as unknown as NotionFeeProperties;

      // 회원 정보 페이지에서 이름 가져오기
      const nameRelation = properties.name?.relation?.[0];
      const amount = properties.paid_fee?.number || 0;
      const date = properties.date?.date?.start || '';
      const methods = properties.method?.multi_select?.map(m => m.name) || ['cash'];
      
      console.log('Special Fee methods from Notion:', methods);

      return {
        id: page.id,
        amount,
        date,
        eventName: nameRelation ? nameRelation.id : '',  // 임시로 ID 저장
        method: methods,
      };
    });

    // 회원 이름 가져오기
    const feePromises = fees.map(async (fee) => {
      if (fee.eventName) {
        const memberPage = await notionClient.pages.retrieve({ page_id: fee.eventName });
        if (!isFullPage(memberPage)) {
          throw new Error('Invalid member page from Notion API');
        }
        const memberProperties = memberPage.properties as unknown as NotionMemberProperties;
        const memberName = memberProperties.Name?.title?.[0]?.plain_text || '';
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
    return NextResponse.json({ 
      error: '특별회비 내역을 가져오는데 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 