import { NextResponse } from 'next/server';
import { notionClient, TRANSACTIONS_DB_ID } from '@/lib/notion';
import type { Transaction, TransactionResponse } from '@/app/types/transaction';
import { NotionTransactionProperties } from '@/app/types/notionProperties';

export async function GET(request: Request) {
  try {
    // URL 쿼리 파라미터 가져오기
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const description = searchParams.get('description');
    
    // 필터 설정
    const filter: any = {
      and: []
    };
    
    // 날짜 필터 추가
    if (startDate) {
      filter.and.push({
        property: 'date',
        date: {
          on_or_after: startDate,
        },
      });
    }
    
    if (endDate) {
      filter.and.push({
        property: 'date',
        date: {
          on_or_before: endDate,
        },
      });
    }
    
    // 내용 필터 추가
    if (description) {
      filter.and.push({
        property: 'description',
        rich_text: {
          contains: description,
        },
      });
    }
    
    // 필터가 없는 경우 기본 필터 제거
    if (filter.and.length === 0) {
      delete filter.and;
    }
    
    // 노션 데이터베이스 쿼리
    const queryOptions: any = {
      database_id: TRANSACTIONS_DB_ID,
      sorts: [
        {
          property: 'date',
          direction: 'descending',
        },
      ],
    };
    
    // 필터가 있는 경우에만 필터 추가
    if (filter.and && filter.and.length > 0) {
      queryOptions.filter = filter;
    }
    
    const response = await notionClient.databases.query(queryOptions);
    
    // 결과 변환
    const transactions: Transaction[] = response.results.map((page: any) => {
      const properties = page.properties as unknown as NotionTransactionProperties;
      
      return {
        id: page.id,
        date: properties.date.date.start,
        in: properties.in.number || 0,
        out: properties.out.number || 0,
        balance: properties.balance.number || 0,
        description: properties.description.rich_text[0]?.plain_text || '',
        branch: properties.branch?.rich_text[0]?.plain_text || '',
        bank: properties.bank?.rich_text[0]?.plain_text || '',
        memo: properties.memo?.rich_text[0]?.plain_text || '',
      };
    });
    
    return NextResponse.json({ transactions } as TransactionResponse);
  } catch (error) {
    console.error('거래내역 조회 오류:', error);
    return NextResponse.json(
      { error: '거래내역을 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 