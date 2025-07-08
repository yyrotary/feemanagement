import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    // URL 쿼리 파라미터 가져오기
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const description = searchParams.get('description');
    
    // 기본 쿼리 설정
    let query = supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });
    
    // 날짜 필터 추가
    if (startDate) {
      query = query.gte('date', startDate);
    }
    
    if (endDate) {
      query = query.lte('date', endDate);
    }
    
    // 내용 필터 추가
    if (description) {
      query = query.ilike('description', `%${description}%`);
    }
    
    const { data: transactions, error } = await query;
    
    if (error) {
      throw error;
    }
    
    // 결과 변환 (기존 API 응답 형식 유지)
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      date: transaction.date,
      in: transaction.in_amount || 0,
      out: transaction.out_amount || 0,
      balance: transaction.balance || 0,
      description: transaction.description || '',
      branch: transaction.branch || '',
      bank: transaction.bank || '',
      memo: transaction.memo || '',
    }));
    
    return NextResponse.json({
      transactions: formattedTransactions,
      count: formattedTransactions.length,
    });
  } catch (error) {
    console.error('거래내역 조회 중 오류 발생:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '거래내역을 조회할 수 없습니다.' },
      { status: 500 }
    );
  }
} 