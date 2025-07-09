import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // 마스터 정보 가져오기 (회비 설정용) - 안전하게 처리
    let juniorFee = 360000; // 기본값
    let emeritusFee = 200000; // 기본값

    try {
      // key-value 형태로 저장된 마스터 정보에서 회비 설정 조회
      const { data: juniorFeeData } = await supabase
        .from('master_info')
        .select('value')
        .eq('key', 'junior_fee')
        .single();
      
      const { data: emeritusFeeData } = await supabase
        .from('master_info')
        .select('value')
        .eq('key', 'emeritus_fee')
        .single();

      if (juniorFeeData?.value) {
        juniorFee = parseFloat(juniorFeeData.value) || 360000;
      }
      
      if (emeritusFeeData?.value) {
        emeritusFee = parseFloat(emeritusFeeData.value) || 200000;
      }
    } catch (masterError) {
      console.log('마스터 정보 조회 실패, 기본값 사용:', masterError);
      // 마스터 정보 조회 실패시 기본값 사용
    }

    const { data: members, error } = await supabase
      .from('members')
      .select('id, name, nickname, phone, join_date, member_fee, paid_fee, unpaid_fee, deduction')
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    // deduction 배열을 기반으로 member_type 계산 및 동적 회비 설정
    const membersWithType = members.map(member => {
      let member_type = 'regular';
      let calculated_fee = 720000; // 기본: 일반 회원

      if (member.deduction && Array.isArray(member.deduction)) {
        if (member.deduction.includes('emeritus')) {
          member_type = 'emeritus';
          calculated_fee = emeritusFee;
        } else if (member.deduction.includes('junior')) {
          member_type = 'junior';
          calculated_fee = juniorFee;
        }
      }

      return {
        ...member,
        member_type,
        member_fee: calculated_fee
      };
    });

    return NextResponse.json(membersWithType);
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: '회원 목록을 불러오는데 실패했습니다.' }, 
      { status: 500 }
    );
  }
}