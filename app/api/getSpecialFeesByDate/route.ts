import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const rotaryYear = searchParams.get('rotaryYear') || 'current';

    console.log('getSpecialFeesByDate API 호출됨:', { date, rotaryYear });

    if (!date) {
      return NextResponse.json({ error: '날짜는 필수 입력값입니다.' }, { status: 400 });
    }

    // 회기 정보 조회
    const keyName = rotaryYear === 'current' ? 'rotary_year_start' : 'previous_year_start';
    const endKeyName = rotaryYear === 'current' ? 'rotary_year_end' : 'previous_year_end';
    
    const { data: rotaryYearInfo, error: rotaryError } = await supabase
      .from('master_info')
      .select('key, value')
      .in('key', [keyName, endKeyName]);
    
    if (rotaryError) {
      throw new Error(`회기 정보 조회 실패: ${rotaryError.message}`);
    }
    
    const startDate = rotaryYearInfo?.find(item => item.key === keyName)?.value;
    const endDate = rotaryYearInfo?.find(item => item.key === endKeyName)?.value;
    
    if (!startDate || !endDate) {
      throw new Error('회기 정보를 찾을 수 없습니다.');
    }
    
    console.log('Rotary year date range for special fees by date:', startDate, 'to', endDate);

    // 특별회비 데이터 조회 (날짜별, 회기 날짜 범위 적용)
    const { data: fees, error } = await supabase
      .from('special_fees')
      .select(`
        id,
        member_id,
        member_name,
        amount,
        date,
        method
      `)
      .eq('date', date)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`특별회비 조회 실패: ${error.message}`);
    }

    console.log('Special Fee records count:', fees?.length || 0);

    // 각 특별회비 기록에 대해 회원 정보 조회
    const formattedFees = await Promise.all(
      (fees || []).map(async fee => {
        let memberName = '회원';

        if (fee.member_id) {
          try {
            const { data: memberInfo, error: memberError } = await supabase
              .from('members')
              .select('name')
              .eq('id', fee.member_id)
              .single();

            if (!memberError && memberInfo) {
              memberName = memberInfo.name;
            }
          } catch (err) {
            console.error('회원 정보 조회 실패:', err);
          }
        }

        return {
          id: fee.id,
          memberId: fee.member_id || '',
          memberName: memberName,
          amount: fee.amount || 0,
          date: fee.date || '',
          method: Array.isArray(fee.method) ? fee.method[0] : (fee.method || 'deposit'),
        };
      })
    );

    return NextResponse.json({ 
      fees: formattedFees,
      rotaryYear: rotaryYear === 'current' ? '25-26' : '24-25',
      dateRange: `${startDate} ~ ${endDate}`
    });
  } catch (error) {
    console.error('Error fetching special fees by date:', error);
    return NextResponse.json({ 
      error: '특별회비 내역을 가져오는데 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 