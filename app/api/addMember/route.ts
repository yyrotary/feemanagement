import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { name, nickname, phone, joinDate, deduction } = await request.json();

    // 필수 필드 검증
    if (!name || !name.trim()) {
      return NextResponse.json({ 
        error: '회원 이름은 필수 항목입니다.' 
      }, { status: 400 });
    }

    // 이름 중복 확인
    const { data: duplicateName, error: nameError } = await supabase
      .from('members')
      .select('id')
      .eq('name', name.trim())
      .single();

    if (nameError && nameError.code !== 'PGRST116') {
      console.error('이름 중복 확인 에러:', nameError);
    } else if (duplicateName) {
      return NextResponse.json({ 
        error: '이미 존재하는 회원 이름입니다.' 
      }, { status: 400 });
    }

    // 전화번호 중복 확인 (전화번호가 있는 경우)
    if (phone) {
      const { data: duplicatePhone, error: phoneError } = await supabase
        .from('members')
        .select('id')
        .eq('phone', parseInt(phone))
        .single();

      if (phoneError && phoneError.code !== 'PGRST116') {
        console.error('전화번호 중복 확인 에러:', phoneError);
      } else if (duplicatePhone) {
        return NextResponse.json({ 
          error: '이미 등록된 전화번호입니다.' 
        }, { status: 400 });
      }
    }

    // 마스터 정보에서 회비 설정 가져오기 - 안전하게 처리
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

    // 회비 계산
    let member_fee = 720000; // 기본: 일반 회원
    if (Array.isArray(deduction)) {
      if (deduction.includes('junior')) {
        member_fee = juniorFee;
      } else if (deduction.includes('emeritus')) {
        member_fee = emeritusFee;
      }
    }

    // 새 회원 추가
    const newMemberData: any = {
      name: name.trim(),
      nickname: nickname ? nickname.trim() : null,
      phone: phone ? parseInt(phone) : null,
      join_date: joinDate || null,
      deduction: Array.isArray(deduction) ? deduction : [],
      member_fee: member_fee,
      paid_fee: 0,
      unpaid_fee: member_fee,
      total_donation: 0,
      friendship_donation: 0,
      contribution_score: 0
    };

    const { data: newMember, error: insertError } = await supabase
      .from('members')
      .insert(newMemberData)
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      message: '회원이 성공적으로 추가되었습니다.',
      member: newMember
    });

  } catch (error) {
    console.error('Error adding member:', error);
    return NextResponse.json({ 
      error: '회원 추가에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 