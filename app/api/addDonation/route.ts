import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { date, memberId, paid_fee, method, class: donationClass, from_friend } = await request.json();

    // 회원 이름 조회
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('name')
      .eq('id', memberId)
      .single();

    if (memberError) {
      throw new Error(`회원 정보 조회 실패: ${memberError.message}`);
    }

    // 기부 기록 데이터 준비
    const donationData: any = {
      member_id: memberId,
      member_name: member?.name || '회원',
      date: date,
      amount: paid_fee,
      method: method,
      category: [donationClass] // 배열 형태로 저장
    };

    // 우정기부인 경우 from_friend 정보 처리
    if (from_friend) {
      if (typeof from_friend === 'object' && from_friend.id) {
        // 우정기부 회원 정보 조회
        const { data: friendMember, error: friendError } = await supabase
          .from('members')
          .select('name')
          .eq('id', from_friend.id)
          .single();

        if (!friendError && friendMember) {
          donationData.from_friend_id = from_friend.id;
          donationData.from_friend_name = friendMember.name;
        }
      } else if (typeof from_friend === 'string') {
        // 이름으로 회원 검색
        const { data: friendMember, error: friendError } = await supabase
          .from('members')
          .select('id, name')
          .eq('name', from_friend)
          .single();

        if (!friendError && friendMember) {
          donationData.from_friend_id = friendMember.id;
          donationData.from_friend_name = friendMember.name;
        } else {
          // 회원을 찾지 못한 경우 이름만 저장
          donationData.from_friend_name = from_friend;
        }
      }

      // 기존 from_friend 필드도 호환성을 위해 저장
      donationData.from_friend = JSON.stringify(from_friend);
    }

    // Supabase에 새 기부 기록 생성
    const { data: donation, error } = await supabase
      .from('donations')
      .insert(donationData)
      .select('id')
      .single();

    if (error) {
      throw new Error(`기부 기록 생성 실패: ${error.message}`);
    }

    // 생성된 레코드의 ID를 반환
    return NextResponse.json({
      id: donation.id,
      success: true
    });
  } catch (error) {
    console.error('Error adding donation:', error);
    return NextResponse.json({ 
      error: '기부 기록에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 