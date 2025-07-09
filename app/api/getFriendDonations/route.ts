import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const friendId = searchParams.get('friendId');
  const rotaryYear = searchParams.get('rotaryYear') || 'current';

  if (!friendId) {
    return NextResponse.json(
      { error: '회원 ID가 필요합니다.' },
      { status: 400 }
    );
  }

  try {
    console.log('getFriendDonations API 호출됨:', { friendId, rotaryYear });

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
    
    console.log('Rotary year date range for friend donations:', startDate, 'to', endDate);

    // 해당 회기의 우정기부 조회 (현재 회원이 from_friend인 기부 내역)
    const { data: donations, error } = await supabase
      .from('donations')
      .select('*')
      .not('from_friend', 'is', null)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`기부 내역 조회 실패: ${error.message}`);
    }

    // from_friend에 해당 friendId가 포함된 기부만 필터링
    const friendDonations = donations?.filter(donation => {
      if (donation.from_friend) {
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
          return false;
        }
        
        // id나 name이 friendId와 일치하는지 확인
        return fromFriend.id === friendId || fromFriend.name === friendId;
      }
      return false;
    }) || [];

    const mappedDonations = friendDonations.map(donation => ({
      id: donation.id,
      date: donation.date,
      paid_fee: donation.amount,
      class: Array.isArray(donation.category) ? donation.category : [],
      method: donation.method ? [donation.method] : [],
      memberId: donation.member_id || '',
      memberName: donation.member_name || '회원'
    }));

    return NextResponse.json({ 
      donations: mappedDonations,
      rotaryYear: rotaryYear === 'current' ? '25-26' : '24-25',
      dateRange: `${startDate} ~ ${endDate}`
    });
  } catch (error) {
    console.error('Error fetching friend donations:', error);
    return NextResponse.json(
      { error: '우정기부 내역을 가져오는데 실패했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 