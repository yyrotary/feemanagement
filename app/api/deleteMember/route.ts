import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ 
        error: '삭제할 회원 ID가 필요합니다.' 
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

    // 회원과 관련된 데이터 확인
    const relatedDataChecks = await Promise.all([
      // 회비 납부 내역 확인
      supabase.from('fees').select('id').eq('member_id', id).limit(1),
      // 특별회비 납부 내역 확인  
      supabase.from('special_fees').select('id').eq('member_id', id).limit(1),
      // 봉사금 납부 내역 확인
      supabase.from('service_fees').select('id').eq('member_id', id).limit(1),
      // 기부금 납부 내역 확인
      supabase.from('donations').select('id').eq('member_id', id).limit(1),
      // 경조사 이벤트 확인
      supabase.from('special_events').select('id').eq('member_id', id).limit(1)
    ]);

    const hasRelatedData = relatedDataChecks.some(check => 
      check.data && check.data.length > 0
    );

    if (hasRelatedData) {
      return NextResponse.json({ 
        error: '이 회원과 관련된 납부 내역이나 경조사 이벤트가 있어 삭제할 수 없습니다. 관련 데이터를 먼저 정리해주세요.' 
      }, { status: 400 });
    }

    // 회원 삭제
    const { error: deleteError } = await supabase
      .from('members')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      message: '회원이 성공적으로 삭제되었습니다.',
      deletedMember: existingMember
    });

  } catch (error) {
    console.error('Error deleting member:', error);
    return NextResponse.json({ 
      error: '회원 삭제에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 