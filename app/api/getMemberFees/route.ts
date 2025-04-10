import { NextResponse } from 'next/server';
import { notionClient, DATABASE_IDS } from '@/lib/notion';
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { NotionMemberProperties, NotionFeeProperties } from '@/app/types/notionProperties';
import { Member, MemberWithFees, MembersWithFeesResponse } from '@/app/types/member';

export async function GET() {
  try {
    // 회원 목록 가져오기
    const membersResponse = await notionClient.databases.query({
      database_id: DATABASE_IDS.MEMBERS,
      sorts: [
        {
          property: 'Name',
          direction: 'ascending'
        }
      ]
    });

    // 회비 정보 가져오기
    const feesResponse = await notionClient.databases.query({
      database_id: DATABASE_IDS.FEES,
    });

    // 특별회비 정보 가져오기
    const specialFeesResponse = await notionClient.databases.query({
      database_id: DATABASE_IDS.SPECIAL_FEES,
    });

    // 회원 정보 매핑
    const members: MemberWithFees[] = membersResponse.results.map((page) => {
      const pageObj = page as PageObjectResponse;
      const properties = pageObj.properties as unknown as NotionMemberProperties;
      
      // 닉네임 추출 (nick 또는 Nickname 필드가 있을 수 있음)
      let nickname = '';
      if (properties.nick && properties.nick.rich_text.length > 0) {
        nickname = properties.nick.rich_text[0].plain_text;
      } else if (properties.Nickname && properties.Nickname.rich_text.length > 0) {
        nickname = properties.Nickname.rich_text[0].plain_text;
      }
      
      // 공제 정보 추출
      const deduction = properties.deduction ? 
        properties.deduction.multi_select.map(item => item.name) : [];
      
      const memberId = pageObj.id;
      const memberName = properties.Name.title[0].plain_text;
      
      // 해당 회원의 일반 회비 필터링
      const memberFees = feesResponse.results.filter((fee) => {
        const feeObj = fee as PageObjectResponse;
        const member = feeObj.properties.member as any;
        return member?.relation?.some((rel: any) => rel.id === memberId);
      });
      
      // 해당 회원의 특별 회비 필터링
      const memberSpecialFees = specialFeesResponse.results.filter((fee) => {
        const feeObj = fee as PageObjectResponse;
        const member = feeObj.properties.member as any;
        return member?.relation?.some((rel: any) => rel.id === memberId);
      });
      
      // 일반 회비 합계 계산
      const regularTotal = memberFees.reduce((sum, fee) => {
        const feeObj = fee as PageObjectResponse;
        const properties = feeObj.properties as unknown as NotionFeeProperties;
        return sum + (properties.paid_fee?.number || 0);
      }, 0);
      
      // 특별 회비 합계 계산
      const specialTotal = memberSpecialFees.reduce((sum, fee) => {
        const feeObj = fee as PageObjectResponse;
        const properties = feeObj.properties as unknown as NotionFeeProperties;
        return sum + (properties.paid_fee?.number || 0);
      }, 0);
      
      return {
        id: memberId,
        name: memberName,
        nickname: nickname,
        deduction: deduction,
        totalPaid: regularTotal + specialTotal,
        regulars: {
          count: memberFees.length,
          amount: regularTotal
        },
        specials: {
          count: memberSpecialFees.length,
          amount: specialTotal
        }
      };
    });

    return NextResponse.json({ members } as MembersWithFeesResponse);
  } catch (error) {
    console.error('Error fetching member fees:', error);
    return NextResponse.json(
      { error: '회원 회비 정보를 불러오는데 실패했습니다.' }, 
      { status: 500 }
    );
  }
}