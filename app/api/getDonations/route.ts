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

    // 개별 회원 정보는 각 기부금 기록마다 조회함

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

    console.log('쿼리 실행 중...');
    const { data: donations, error } = await query;

    if (error) {
      console.error('Supabase 쿼리 에러:', error);
      throw error;
    }

    console.log('donations 조회 결과:', donations);

    // 각 기부금 기록에 대해 회원 정보 조회
    const formattedDonations = await Promise.all(
      (donations || []).map(async donation => {
        let memberName = '회원';

        if (donation.member_id) {
          try {
            const { data: donationMemberInfo, error: donationMemberError } = await supabase
              .from('members')
              .select('name')
              .eq('id', donation.member_id)
              .single();

            if (!donationMemberError && donationMemberInfo) {
              memberName = donationMemberInfo.name;
            }
          } catch (err) {
            console.error('기부금 회원 정보 조회 실패:', err);
          }
        }

        return {
          id: donation.id,
          date: donation.date,
          paid_fee: donation.amount,
          class: Array.isArray(donation.category) ? donation.category : [donation.category || ''],
          method: Array.isArray(donation.method) ? donation.method : [donation.method || ''],
          memberId: donation.member_id,
          memberName: memberName,
          from_friend: donation.from_friend ? (() => {
            let fromFriend;
            
            // from_friend가 문자열인 경우 JSON 파싱 시도
            if (typeof donation.from_friend === 'string') {
              try {
                fromFriend = JSON.parse(donation.from_friend);
              } catch (e) {
                // 파싱 실패시 문자열 그대로 사용
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
          })() : undefined
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