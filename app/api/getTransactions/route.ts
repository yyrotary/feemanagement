import { NextResponse } from 'next/server';
import { notionClient, TRANSACTIONS_DB_ID } from '@/lib/notion';
import type { Transaction } from '@/lib/notion-types';

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
      return {
        id: page.id,
        date: page.properties.date?.date?.start || '',
        in: page.properties.in?.number || 0,
        out: page.properties.out?.number || 0,
        balance: page.properties.balance?.number || 0,
        description: page.properties.description?.rich_text?.[0]?.plain_text || '',
        branch: page.properties.branch?.rich_text?.[0]?.plain_text || '',
        bank: page.properties.bank?.rich_text?.[0]?.plain_text || '',
        memo: page.properties.memo?.rich_text?.[0]?.plain_text || '',
      };
    });
    
    return NextResponse.json({
      transactions,
      count: transactions.length,
    });
  } catch (error) {
    console.error('거래내역 조회 중 오류 발생:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '거래내역을 조회할 수 없습니다.' },
      { status: 500 }
    );
  }
} 