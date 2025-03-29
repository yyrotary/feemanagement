import { NextResponse } from 'next/server';
import { notion, MEMBER_DB_ID, FEE_DB_ID } from '@/lib/notion';

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

    const member = memberResponse.results[0];
    const name = member.properties.Name.title[0].plain_text;
    const isElder = member.properties.deduction.select?.name === '원로';
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

    const feeHistory = feeResponse.results.map(fee => ({
      date: fee.properties.date.date.start,
      paid_fee: fee.properties.paid_fee.number,
      method: fee.properties.method.multi_select.map(m => m.name)
    }));

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