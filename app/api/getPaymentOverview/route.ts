import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rotaryYear = searchParams.get('rotaryYear') || 'current';
    const searchTerm = searchParams.get('search') || '';

    console.log('getPaymentOverview API 호출됨:', { rotaryYear, searchTerm });

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
    
    console.log('Rotary year date range:', startDate, 'to', endDate);

    // 모든 회원 조회
    let membersQuery = supabase
      .from('members')
      .select('id, name, nickname, phone, deduction')
      .order('name');

    // 검색어가 있으면 필터링
    if (searchTerm) {
      membersQuery = membersQuery.or(`name.ilike.%${searchTerm}%,nickname.ilike.%${searchTerm}%`);
    }

    const { data: members, error: membersError } = await membersQuery;
    
    if (membersError) {
      throw new Error(`회원 정보 조회 실패: ${membersError.message}`);
    }

    console.log(`총 ${members.length}명 회원 조회됨`);

    // 마스터 정보에서 회비 설정 가져오기
    let juniorFee = 360000; // 기본값
    let emeritusFee = 200000; // 기본값

    try {
      const { data: feeSettings } = await supabase
        .from('master_info')
        .select('key, value')
        .in('key', ['junior_fee', 'emeritus_fee']);

      if (feeSettings) {
        const juniorFeeData = feeSettings.find(item => item.key === 'junior_fee');
        const emeritusFeeData = feeSettings.find(item => item.key === 'emeritus_fee');

        if (juniorFeeData?.value) {
          juniorFee = parseFloat(juniorFeeData.value) || 360000;
        }
        if (emeritusFeeData?.value) {
          emeritusFee = parseFloat(emeritusFeeData.value) || 200000;
        }
      }
    } catch (feeError) {
      console.log('회비 설정 조회 실패, 기본값 사용:', feeError);
    }

    console.log('회비 설정:', { juniorFee, emeritusFee });

    // 각 회원별 납부 현황 계산
    const memberPaymentOverview = await Promise.all(
      members.map(async (member) => {
        // deduction 배열에 'emeritus'가 있는지 확인 (원로회원)
        const isEmeritus = Array.isArray(member.deduction) && 
                          member.deduction.some((item: string) => item === 'emeritus') || false;
        // deduction 배열에 'junior'가 있는지 확인 (주니어회원)
        const isJunior = Array.isArray(member.deduction) && 
                        member.deduction.some((item: string) => item === 'junior') || false;
        
        // 회비 계산: 원로회원, 주니어회원, 일반회원
        let requiredFee = 720000; // 기본: 일반회원
        if (isEmeritus) {
          requiredFee = emeritusFee;
        } else if (isJunior) {
          requiredFee = juniorFee;
        }

        // 1. 연회비 납부 현황
        const { data: fees } = await supabase
          .from('fees')
          .select('amount')
          .eq('member_id', member.id)
          .gte('date', startDate)
          .lte('date', endDate);

        const totalFees = fees?.reduce((sum, fee) => sum + (fee.amount || 0), 0) || 0;
        const remainingFees = Math.max(0, requiredFee - totalFees);

        // 2. 특별회비 (경조사) 현황
        const { data: specialFees } = await supabase
          .from('special_fees')
          .select('amount')
          .eq('member_id', member.id)
          .gte('date', startDate)
          .lte('date', endDate);

        const totalSpecialFees = specialFees?.reduce((sum, fee) => sum + (fee.amount || 0), 0) || 0;

        // 경조사 목록 조회하여 납부해야 할 금액 계산
        const { data: events } = await supabase
          .from('special_events')
          .select('*')
          .gte('date', startDate)
          .lte('date', endDate);

        // 본인 경조사가 아닌 이벤트만 필터링
        const payableEvents = events?.filter(event => 
          event.member_name !== member.name && event.member_id !== member.id
        ) || [];

        const { data: specialEventFeeInfo } = await supabase
          .from('master_info')
          .select('value')
          .eq('key', 'special_event_fee')
          .single();

        const specialEventFee = specialEventFeeInfo?.value ? parseInt(specialEventFeeInfo.value) : 20000;
        const requiredSpecialFees = payableEvents.length * specialEventFee;
        const remainingSpecialFees = Math.max(0, requiredSpecialFees - totalSpecialFees);

        // 3. 봉사금 현황
        const { data: serviceFees } = await supabase
          .from('service_fees')
          .select('amount')
          .eq('member_id', member.id)
          .gte('date', startDate)
          .lte('date', endDate);

        const totalServiceFees = serviceFees?.reduce((sum, fee) => sum + (fee.amount || 0), 0) || 0;
        const requiredServiceFees = 500000; // 의무 봉사금
        const remainingServiceFees = Math.max(0, requiredServiceFees - totalServiceFees);

        // 4. 기부금 현황 (본인 기부 + 우정기부)
        const { data: donations } = await supabase
          .from('donations')
          .select('amount')
          .eq('member_id', member.id)
          .gte('date', startDate)
          .lte('date', endDate);

        const totalDonations = donations?.reduce((sum, donation) => sum + (donation.amount || 0), 0) || 0;

        // 우정기부 (from_friend가 현재 회원인 기부)
        const { data: allDonations } = await supabase
          .from('donations')
          .select('amount, from_friend')
          .not('from_friend', 'is', null)
          .gte('date', startDate)
          .lte('date', endDate);

        const friendDonations = allDonations?.filter(donation => {
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
            
            // id나 name이 member와 일치하는지 확인
            return fromFriend.id === member.id || fromFriend.name === member.name;
          }
          return false;
        }) || [];

        const totalFriendDonations = friendDonations.reduce((sum, donation) => sum + (donation.amount || 0), 0);
        const grandTotalDonations = totalDonations + totalFriendDonations;

        return {
          memberId: member.id,
          memberName: member.name,
          nickname: member.nickname || '',
          phone: member.phone,
          isElder: isEmeritus, // 원로회원 여부
          // 연회비
          requiredFee,
          totalFees,
          remainingFees,
          feeCompletionRate: requiredFee > 0 ? Math.round((totalFees / requiredFee) * 100) : 100,
          // 특별회비 (경조사)
          requiredSpecialFees,
          totalSpecialFees,
          remainingSpecialFees,
          specialFeeEvents: payableEvents.length,
          specialCompletionRate: requiredSpecialFees > 0 ? Math.round((totalSpecialFees / requiredSpecialFees) * 100) : 100,
          // 봉사금
          requiredServiceFees,
          totalServiceFees,
          remainingServiceFees,
          serviceCompletionRate: Math.round((totalServiceFees / requiredServiceFees) * 100),
          // 기부금
          totalDonations,
          totalFriendDonations,
          grandTotalDonations
        };
      })
    );

    // 통계 정보 계산
    const totalMembers = memberPaymentOverview.length;
    const feeCompleteMembers = memberPaymentOverview.filter(m => m.remainingFees === 0).length;
    const specialFeeCompleteMembers = memberPaymentOverview.filter(m => m.remainingSpecialFees === 0).length;
    const serviceFeeCompleteMembers = memberPaymentOverview.filter(m => m.remainingServiceFees === 0).length;

    const summary = {
      totalMembers,
      feeCompleteMembers,
      feeCompletionRate: totalMembers > 0 ? Math.round((feeCompleteMembers / totalMembers) * 100) : 0,
      specialFeeCompleteMembers,
      specialCompletionRate: totalMembers > 0 ? Math.round((specialFeeCompleteMembers / totalMembers) * 100) : 0,
      serviceFeeCompleteMembers,
      serviceCompletionRate: totalMembers > 0 ? Math.round((serviceFeeCompleteMembers / totalMembers) * 100) : 0,
      totalCollectedFees: memberPaymentOverview.reduce((sum, m) => sum + m.totalFees, 0),
      totalCollectedSpecialFees: memberPaymentOverview.reduce((sum, m) => sum + m.totalSpecialFees, 0),
      totalCollectedServiceFees: memberPaymentOverview.reduce((sum, m) => sum + m.totalServiceFees, 0),
      totalCollectedDonations: memberPaymentOverview.reduce((sum, m) => sum + m.grandTotalDonations, 0)
    };

    return NextResponse.json({
      success: true,
      rotaryYear: rotaryYear === 'current' ? '25-26' : '24-25',
      dateRange: `${startDate} ~ ${endDate}`,
      summary,
      members: memberPaymentOverview
    });

  } catch (error) {
    console.error('Error fetching payment overview:', error);
    return NextResponse.json({ 
      error: '납부 현황을 가져오는데 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 