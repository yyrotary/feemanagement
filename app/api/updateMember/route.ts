import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PUT(request: Request) {
  try {
    const { id, name, nickname, phone, joinDate, deduction } = await request.json();

    // 필수 필드 검증
    if (!id || !name) {
      return NextResponse.json({ 
        error: '회원 ID와 이름은 필수 항목입니다.' 
      }, { status: 400 });
    }

    // 회원 존재 여부 확인
    const { data: existingMember, error: fetchError } = await supabase
      .from('members')
      .select('id, name')
      .eq('id', id)
      .single();

    if (fetchError || !existingMember) {
      return NextResponse.json({ 
        error: '존재하지 않는 회원입니다.' 
      }, { status: 404 });
    }

    // 전화번호 중복 확인 (다른 회원이 같은 전화번호를 사용하는지 확인)
    if (phone) {
      const { data: duplicatePhone, error: phoneError } = await supabase
        .from('members')
        .select('id')
        .eq('phone', phone)
        .neq('id', id);

      if (phoneError) {
        console.error('전화번호 중복 확인 에러:', phoneError);
      } else if (duplicatePhone && duplicatePhone.length > 0) {
        return NextResponse.json({ 
          error: '다른 회원이 이미 사용 중인 전화번호입니다.' 
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

    // 회원 정보 업데이트
    const updateData: any = {
      name: name.trim(),
      nickname: nickname ? nickname.trim() : null,
      phone: phone ? parseInt(phone) : null,
      join_date: joinDate || null,
      deduction: Array.isArray(deduction) ? deduction : [],
      member_fee: member_fee,
      unpaid_fee: member_fee
    };

    const { data: updatedMember, error: updateError } = await supabase
      .from('members')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      message: '회원 정보가 성공적으로 수정되었습니다.',
      member: updatedMember
    });

  } catch (error) {
    console.error('Error updating member:', error);
    return NextResponse.json({ 
      error: '회원 정보 수정에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 