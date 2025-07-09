import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get('memberId');
  const date = searchParams.get('date');
  const rotaryYear = searchParams.get('rotaryYear') || 'current';

  try {
    console.log('getDonations API 호출됨:', { memberId, date, rotaryYear });

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
    
    console.log('Rotary year date range for donations:', startDate, 'to', endDate);

    // 기본 쿼리 설정 (회기 날짜 범위 적용)
    let query = supabase
      .from('donations')
      .select(`
        id,
        member_id,
        member_name,
        amount,
        date,
        method,
        category,
        from_friend,
        from_friend_id,
        from_friend_name,
        created_at
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    // 필터 적용
    if (memberId) {
      query = query.eq('member_id', memberId);
    } else if (date) {
      query = query.eq('date', date);
    }

    const { data: donations, error } = await query;

    if (error) {
      throw new Error(`기부 내역 조회 실패: ${error.message}`);
    }

    console.log('Raw donations data:', donations);

    const formattedDonations = await Promise.all(
      (donations || []).map(async donation => {
        // 회원 이름은 이미 member_name에 있으므로 별도 조회 불필요
        const memberName = donation.member_name || '회원';

        return {
          id: donation.id,
          date: donation.date,
          paid_fee: donation.amount,
          class: Array.isArray(donation.category) ? donation.category : [donation.category || ''],
          method: Array.isArray(donation.method) ? donation.method : [donation.method || ''],
          memberId: donation.member_id,
          memberName: memberName,
          from_friend: donation.from_friend_name ? {
            id: donation.from_friend_id || '',
            name: donation.from_friend_name
          } : (donation.from_friend ? (() => {
            // 기존 from_friend 필드의 데이터 처리 (호환성을 위해)
            let fromFriend;
            
            if (typeof donation.from_friend === 'string') {
              try {
                fromFriend = JSON.parse(donation.from_friend);
              } catch (e) {
                fromFriend = { name: donation.from_friend };
              }
            } else if (typeof donation.from_friend === 'object') {
              fromFriend = donation.from_friend;
            } else {
              fromFriend = { name: String(donation.from_friend) };
            }
            
            return {
              id: fromFriend.id || '',
              name: fromFriend.name || '친구'
            };
          })() : undefined)
        };
      })
    );

    console.log('formatted donations:', formattedDonations);

    return NextResponse.json({ 
      donations: formattedDonations,
      rotaryYear: rotaryYear === 'current' ? '25-26' : '24-25',
      dateRange: `${startDate} ~ ${endDate}`
    });
  } catch (error) {
    console.error('Error fetching donations:', error);
    return NextResponse.json(
      { 
        error: '기부 내역을 가져오는데 실패했습니다.',
        details: JSON.stringify(error, null, 2)
      },
      { status: 500 }
    );
  }
} 