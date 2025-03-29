import { NextResponse } from 'next/server';
import { notion, MEMBER_DB_ID, FEE_DB_ID } from '@/lib/notion';
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

interface NotionMemberProperties {
  Name: {
    title: Array<{
      plain_text: string;
    }>;
  };
  deduction: {
    select?: {
      name: string;
    };
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

    // 회원 정보 조회
    const memberResponse = await notion.databases.query({
      database_id: MEMBER_DB_ID,
      filter: {
        property: 'phone',
        number: {
          equals: Number(phone)
        }
      }
    });

    if (!memberResponse.results.length) {
      return NextResponse.json({ error: '회원을 찾을 수 없습니다.' }, { status: 404 });
    }

    const member = memberResponse.results[0] as PageObjectResponse;
    const properties = member.properties as unknown as NotionMemberProperties;
    const name = properties.Name.title[0].plain_text;
    const isElder = properties.deduction.select?.name === '원로';
    const requiredFee = isElder ? 200000 : 720000;

    // 회비 내역 조회
    const feeResponse = await notion.databases.query({
      database_id: FEE_DB_ID,
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

    const feeHistory = feeResponse.results.map((fee: PageObjectResponse) => {
      const feeProperties = fee.properties as unknown as NotionFeeProperties;
      return {
        date: feeProperties.date.date.start,
        paid_fee: feeProperties.paid_fee.number,
        method: feeProperties.method.multi_select.map(m => m.name)
      };
    });

    const totalPaid = feeHistory.reduce((sum, fee) => sum + fee.paid_fee, 0);
    const remainingFee = Math.max(0, requiredFee - totalPaid);

    return NextResponse.json({
      name,
      totalPaid,
      remainingFee,
      feeHistory
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}