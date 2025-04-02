import { NextResponse } from 'next/server';
import { notionClient, DATABASE_IDS } from '@/lib/notion';
import { 
  PageObjectResponse 
  
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
  nick: {
    rich_text: Array<{
      plain_text: string;
    }>;
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: '날짜는 필수 입력값입니다.' }, { status: 400 });
    }

    // 특별회비 데이터 조회
    const response = await notionClient.databases.query({
      database_id: DATABASE_IDS.SPECIAL_FEES,
      filter: {
        property: 'date',
        date: {
          equals: date
        }
      },
      sorts: [
        {
          property: 'date',
          direction: 'descending'
        }
      ]
    });

    console.log('Special Fee records count:', response.results.length);

    // 모든 회원 정보를 한 번에 가져오기
    const membersResponse = await notionClient.databases.query({
      database_id: DATABASE_IDS.MEMBERS,
      page_size: 100 // 최대 100명의 회원 정보 가져오기
    });
    console.log('Total members loaded:', membersResponse.results.length);

    // 회원 ID별 매핑 생성
    const memberMap: Record<string, { name: string, nickname: string }> = {};
    membersResponse.results.forEach(member => {
      const memberObj = member as PageObjectResponse;
      const properties = memberObj.properties as unknown as NotionMemberProperties;
      
      try {
        const name = properties.Name?.title[0]?.plain_text || '회원';
        const nickname = properties.nick?.rich_text[0]?.plain_text || '';
        memberMap[memberObj.id] = { name, nickname };
      } catch (error) {
        console.error(`Error parsing member ${memberObj.id}:`, error);
        memberMap[memberObj.id] = { name: '회원', nickname: '' };
      }
    });

    // 특별회비 데이터에 회원 이름 매핑
    const fees = response.results.map(page => {
      const pageObj = page as PageObjectResponse;
      const properties = pageObj.properties as unknown as NotionFeeProperties;
      
      const memberRelations = properties.name?.relation || [];
      let memberName = '회원';
      let memberId = '';
      
      if (memberRelations.length > 0) {
        memberId = memberRelations[0].id;
        const memberInfo = memberMap[memberId];
        
        if (memberInfo) {
          memberName = memberInfo.name;
        }
      }

      const methods = properties.method?.multi_select?.map(m => m.name) || ['deposit'];
      console.log('Special Fee methods from Notion:', methods);

      return {
        id: pageObj.id,
        memberId,
        memberName,
        amount: properties.paid_fee?.number || 0,
        date: properties.date?.date?.start || '',
        method: methods,
      };
    });

    return NextResponse.json({ fees });
  } catch (error) {
    console.error('Error fetching special fees by date:', error);
    return NextResponse.json({ 
      error: '특별회비 내역을 가져오는데 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 