import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rotaryYear = searchParams.get('rotaryYear') || 'current';

    console.log('TopContributors API - rotaryYear:', rotaryYear);

    // 회기별 날짜 범위 계산
    const now = new Date();
    const currentYear = now.getFullYear();
    const isAfterJuly = now.getMonth() >= 6; // 7월(인덱스 6) 이후

    let startDate: string;
    let endDate: string;

    if (rotaryYear === 'current') {
      if (isAfterJuly) {
        // 현재가 7월 이후라면 현재 연도 7월 1일 ~ 다음 연도 6월 30일
        startDate = `${currentYear}-07-01`;
        endDate = `${currentYear + 1}-06-30`;
      } else {
        // 현재가 6월 이전이라면 전년도 7월 1일 ~ 현재 연도 6월 30일
        startDate = `${currentYear - 1}-07-01`;
        endDate = `${currentYear}-06-30`;
      }
    } else {
      // previous 회기
      if (isAfterJuly) {
        // 현재가 7월 이후라면 전년도 7월 1일 ~ 현재 연도 6월 30일
        startDate = `${currentYear - 1}-07-01`;
        endDate = `${currentYear}-06-30`;
      } else {
        // 현재가 6월 이전이라면 전전년도 7월 1일 ~ 전년도 6월 30일
        startDate = `${currentYear - 2}-07-01`;
        endDate = `${currentYear - 1}-06-30`;
      }
    }

    console.log(`TopContributors API - 조회 기간: ${startDate} ~ ${endDate}`);
    
    // 모든 회원 조회
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, name, nickname');

    if (membersError) {
      throw new Error(`회원 정보 조회 실패: ${membersError.message}`);
    }

    console.log('TopContributors API - 회원 수:', members?.length);

    // 각 회원의 기여도 계산
    const memberContributions = await Promise.all(
      (members || []).map(async (member) => {
        // 1. 봉사금 합계
        const { data: serviceFees } = await supabase
          .from('service_fees')
          .select('amount')
          .eq('member_id', member.id)
          .gte('date', startDate)
          .lte('date', endDate);

        const totalServiceFees = serviceFees?.reduce((sum, fee) => sum + (fee.amount || 0), 0) || 0;

        // 2. 기부금 합계 (본인 기부)
        const { data: donations } = await supabase
          .from('donations')
          .select('amount')
          .eq('member_id', member.id)
          .gte('date', startDate)
          .lte('date', endDate);

        const totalDonations = donations?.reduce((sum, donation) => sum + (donation.amount || 0), 0) || 0;

        // 3. 우정기부 합계 (from_friend가 현재 회원인 기부)
        const { data: allDonations } = await supabase
          .from('donations')
          .select('amount, from_friend')
          .not('from_friend', 'is', null)
          .gte('date', startDate)
          .lte('date', endDate);

        const totalFriendDonations = allDonations?.reduce((sum, donation) => {
          return sum + (donation.from_friend === member.id ? (donation.amount || 0) : 0);
        }, 0) || 0;

        // 총 기여도 계산 (봉사금 + 기부금 + 우정기부)
        const totalContribution = totalServiceFees + totalDonations + totalFriendDonations;

        return {
          id: member.id,
          name: member.name,
          nickname: member.nickname,
          totalAmount: totalContribution
        };
      })
    );

    // 기여도 순으로 정렬하고 상위 5명 선택
    const topContributors = memberContributions
      .filter(member => member.totalAmount > 0) // 기여도가 0인 회원 제외
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 5);

    console.log('TopContributors API - Final contributors:', topContributors);
    
    return NextResponse.json({ contributors: topContributors });
  } catch (error) {
    console.error('Error fetching top contributors:', error);
    return NextResponse.json(
      { 
        error: '데이터를 불러오는 중 오류가 발생했습니다.', 
        contributors: [],
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 