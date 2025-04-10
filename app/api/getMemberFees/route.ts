import { NextResponse } from 'next/server';
import { notionClient, DATABASE_IDS } from '@/lib/notion';
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

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
  deduction: {
    multi_select: Array<{
      id: string;
      name: string;
      color: string;
    }>;
  };
}

interface NotionFeeProperties {
  date: {
    date: {
      start: string;
    };
  };
  paid_fee: {
    number: number;
  };
  method: {
    multi_select: Array<{
      name: string;
    }>;
  };
}

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();
    //console.log('Searching for phone:', phone);

    // 회원 정보 조회
    const memberResponse = await notionClient.databases.query({
      database_id: DATABASE_IDS.MEMBERS,
      filter: {
        property: 'phone',
        number: {
          equals: Number(phone)
        }
      }
    });

    //console.log('Member response:', memberResponse);

    if (!memberResponse.results.length) {
      return NextResponse.json({ error: '회원을 찾을 수 없습니다.' }, { status: 404 });
    }

    const member = memberResponse.results[0] as PageObjectResponse;
    const properties = member.properties as unknown as NotionMemberProperties;
    //console.log('Member properties:', properties);

    //console.log('All properties:', JSON.stringify(properties, null, 2));

    const name = properties.Name.title[0].plain_text;
    const nickname = properties.nick?.rich_text?.[0]?.plain_text || '';

    //console.log('Deduction field:', properties.deduction);  // 필드 이름 확인

    // multi_select 배열에 'senior'가 있는지 확인
    const isElder = properties.deduction.multi_select.some(item => item.name === 'senior');
    const requiredFee = isElder ? 200000 : 720000;

    //console.log('Deduction values:', properties.deduction.multi_select.map(item => item.name));
    //console.log('Is senior:', isElder);
    //console.log('Required fee:', requiredFee);

    // 회비 내역 조회
    const feeResponse = await notionClient.databases.query({
      database_id: DATABASE_IDS.FEES,
      filter: {
        property: 'name',
        relation: {
          contains: member.id
        }
      },
      sorts: [
        {
          property: 'date',
          direction: 'descending'
        }
      ]
    });

    //console.log('Fee response:', feeResponse);

    const feeHistory = feeResponse.results.map((fee) => {
      const feePage = fee as PageObjectResponse;
      const feeProperties = feePage.properties as unknown as NotionFeeProperties;
      const method = feeProperties.method.multi_select.map(m => m.name);
      console.log('General Fee method from Notion:', method, typeof method);
      return {
        date: feeProperties.date.date.start,
        paid_fee: feeProperties.paid_fee.number,
        method
      };
    });

    const totalPaid = feeHistory.reduce((sum, fee) => sum + fee.paid_fee, 0);
    const remainingFee = Math.max(0, requiredFee - totalPaid);

    return NextResponse.json({
      id: member.id,
      name,
      nickname,
      totalPaid,
      remainingFee,
      feeHistory
    });

  } catch (error) {
    console.error('Error details:', error);
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}