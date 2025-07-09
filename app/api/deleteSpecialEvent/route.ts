import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(request: Request) {
  try {
    const { eventId } = await request.json();

    if (!eventId) {
      return NextResponse.json({ 
        error: '삭제할 경조사를 선택해주세요.' 
      }, { status: 400 });
    }

    // 경조사 이벤트 존재 확인
    const { data: existingEvent, error: fetchError } = await supabase
      .from('special_events')
      .select('id, member_name, event_type, date')
      .eq('id', eventId)
      .single();

    if (fetchError || !existingEvent) {
      return NextResponse.json({ 
        error: '존재하지 않는 경조사입니다.' 
      }, { status: 400 });
    }

    // 해당 경조사에 대한 특별회비 납부 내역이 있는지 확인
    const { data: relatedFees, error: feeCheckError } = await supabase
      .from('special_fees')
      .select('id, date, amount')
      .eq('member_id', existingEvent.id)
      .limit(1);

    if (feeCheckError) {
      console.error('특별회비 확인 에러:', feeCheckError);
      // 에러가 있어도 삭제는 진행 (특별회비 테이블과 direct 연결이 없을 수 있음)
    }

    // 경조사 이벤트 삭제
    const { error: deleteError } = await supabase
      .from('special_events')
      .delete()
      .eq('id', eventId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      message: '경조사가 성공적으로 삭제되었습니다.',
      deletedEvent: existingEvent
    });

  } catch (error) {
    console.error('Error deleting special event:', error);
    return NextResponse.json({ 
      error: '경조사 삭제에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 