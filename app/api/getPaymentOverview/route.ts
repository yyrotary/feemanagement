import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rotaryYear = searchParams.get('rotaryYear') || 'current';

    console.log('PaymentOverview API - rotaryYear:', rotaryYear);

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

    // 마스터 정보에서 회비 설정값 조회
    const { data: masterInfo, error: masterInfoError } = await supabase
      .from('master_info')
      .select('key, value')
      .in('key', ['regular_fee', 'junior_fee', 'emeritus_fee']);

    if (masterInfoError) {
      throw new Error(`마스터 정보 조회 실패: ${masterInfoError.message}`);
    }

    const regularFee = parseInt(masterInfo?.find(item => item.key === 'regular_fee')?.value || '720000');
    const juniorFee = parseInt(masterInfo?.find(item => item.key === 'junior_fee')?.value || '360000');
    const emeritusFee = parseInt(masterInfo?.find(item => item.key === 'emeritus_fee')?.value || '200000');

    // 모든 회원 조회
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('*')
      .order('name');

    if (membersError) {
      throw new Error(`회원 조회 실패: ${membersError.message}`);
    }

    // 해당 회기의 모든 데이터 조회
    const [feesResult, serviceFeesResult, specialFeesResult, donationsResult] = await Promise.all([
      supabase.from('fees').select('*').gte('date', startDate).lte('date', endDate),
      supabase.from('service_fees').select('*').gte('date', startDate).lte('date', endDate),
      supabase.from('special_fees').select('*').gte('date', startDate).lte('date', endDate),
      supabase.from('donations').select('*').gte('date', startDate).lte('date', endDate)
    ]);

    if (feesResult.error) throw new Error(`회비 조회 실패: ${feesResult.error.message}`);
    if (serviceFeesResult.error) throw new Error(`봉사금 조회 실패: ${serviceFeesResult.error.message}`);
    if (specialFeesResult.error) throw new Error(`특별회비 조회 실패: ${specialFeesResult.error.message}`);
    if (donationsResult.error) throw new Error(`기부금 조회 실패: ${donationsResult.error.message}`);

    const allFees = feesResult.data || [];
    const allServiceFees = serviceFeesResult.data || [];
    const allSpecialFees = specialFeesResult.data || [];
    const allDonations = donationsResult.data || [];

    // 회원별 납부 현황 계산
    const memberPaymentOverview = await Promise.all(
      members.map(async (member) => {
        // 1. 회비 계산 (회원 유형에 따른 금액)
        let expectedFee = regularFee; // 기본값: 일반회비
        
        if (member.deduction && Array.isArray(member.deduction)) {
          if (member.deduction.includes('emeritus')) {
            expectedFee = emeritusFee; // 원로회원
          } else if (member.deduction.includes('junior')) {
            expectedFee = juniorFee; // 주니어회원
          }
        }

        const memberFees = allFees.filter(fee => fee.member_id === member.id);
        const totalPaidFee = memberFees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
        const unpaidFee = Math.max(0, expectedFee - totalPaidFee);

        // 2. 봉사금 계산
        const memberServiceFees = allServiceFees.filter(fee => fee.member_id === member.id);
        const totalServiceFee = memberServiceFees.reduce((sum, fee) => sum + (fee.amount || 0), 0);

        // 3. 특별회비 계산
        const memberSpecialFees = allSpecialFees.filter(fee => fee.member_id === member.id);
        const totalSpecialFee = memberSpecialFees.reduce((sum, fee) => sum + (fee.amount || 0), 0);

        // 4. 기부금 계산 (본인 기부)
        const memberDonations = allDonations.filter(donation => donation.member_id === member.id);
        const totalDonations = memberDonations.reduce((sum, donation) => sum + (donation.amount || 0), 0);

        // 5. 우정기부 계산 (새로운 필드 우선 사용)
        const friendDonations = allDonations.filter(donation => {
          // 새로운 from_friend_id 필드 사용
          if (donation.from_friend_id === member.id) {
            return true;
          }
          
          // 새로운 from_friend_name 필드 사용
          if (donation.from_friend_name === member.name) {
            return true;
          }

          // 기존 from_friend 필드 호환성 지원
          if (donation.from_friend && !donation.from_friend_id && !donation.from_friend_name) {
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
            
            return fromFriend.id === member.id || fromFriend.name === member.name;
          }
          
          return false;
        });

        const totalFriendDonations = friendDonations.reduce((sum, donation) => sum + (donation.amount || 0), 0);
        const grandTotalDonations = totalDonations + totalFriendDonations;

        return {
          id: member.id,
          name: member.name,
          nickname: member.nickname || '',
          expectedFee,
          paidFee: totalPaidFee,
          unpaidFee,
          serviceFee: totalServiceFee,
          specialFee: totalSpecialFee,
          donation: totalDonations,
          friendDonation: totalFriendDonations,
          totalDonation: grandTotalDonations,
          memberType: member.deduction?.includes('emeritus') ? 'emeritus' : 
                     member.deduction?.includes('junior') ? 'junior' : 'regular'
        };
      })
    );

    // 총합 계산
    const totals = memberPaymentOverview.reduce((acc, member) => ({
      expectedFee: acc.expectedFee + member.expectedFee,
      paidFee: acc.paidFee + member.paidFee,
      unpaidFee: acc.unpaidFee + member.unpaidFee,
      serviceFee: acc.serviceFee + member.serviceFee,
      specialFee: acc.specialFee + member.specialFee,
      donation: acc.donation + member.donation,
      friendDonation: acc.friendDonation + member.friendDonation,
      totalDonation: acc.totalDonation + member.totalDonation
    }), {
      expectedFee: 0,
      paidFee: 0,
      unpaidFee: 0,
      serviceFee: 0,
      specialFee: 0,
      donation: 0,
      friendDonation: 0,
      totalDonation: 0
    });

    return NextResponse.json({
      members: memberPaymentOverview,
      totals,
      rotaryYear: rotaryYear === 'current' ? '25-26' : '24-25',
      dateRange: `${startDate} ~ ${endDate}`,
      feeSettings: {
        regular: regularFee,
        junior: juniorFee,
        emeritus: emeritusFee
      }
    });
  } catch (error) {
    console.error('Error fetching payment overview:', error);
    return NextResponse.json(
      { 
        error: '납부 현황을 가져오는데 실패했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 