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

    // 해당 회원 정보 조회 (이름으로도 검색할 수 있도록)
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, name')
      .or(`id.eq.${friendId},name.eq.${friendId}`)
      .single();

    if (memberError && memberError.code !== 'PGRST116') {
      console.error('회원 조회 오류:', memberError);
    }

    const memberName = member?.name || friendId;
    const memberId = member?.id || friendId;

    // 새로운 from_friend_id/from_friend_name 필드를 사용한 조회
    let query = supabase
      .from('donations')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    // from_friend_id 또는 from_friend_name으로 필터링
    if (member?.id) {
      query = query.eq('from_friend_id', member.id);
    } else {
      query = query.eq('from_friend_name', memberName);
    }

    const { data: donations, error } = await query;

    if (error) {
      throw new Error(`기부 내역 조회 실패: ${error.message}`);
    }

    // 기존 from_friend 필드를 사용한 추가 조회 (호환성을 위해)
    const { data: legacyDonations, error: legacyError } = await supabase
      .from('donations')
      .select('*')
      .not('from_friend', 'is', null)
      .is('from_friend_id', null) // 새 필드가 없는 경우만
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (legacyError) {
      console.error('Legacy donations query error:', legacyError);
    }

    // Legacy 데이터에서 해당 회원과 일치하는 기부 필터링
    const filteredLegacyDonations = (legacyDonations || []).filter(donation => {
      if (donation.from_friend) {
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
          return false;
        }
        
        return fromFriend.id === friendId || fromFriend.name === memberName;
      }
      return false;
    });

    // 두 결과 합치기
    const allDonations = [...(donations || []), ...filteredLegacyDonations];

    const mappedDonations = allDonations.map(donation => ({
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