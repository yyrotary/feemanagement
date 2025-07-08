import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { recordId } = await request.json();

    if (!recordId) {
      return NextResponse.json({ error: '기록 ID는 필수입니다.' }, { status: 400 });
    }

    // Supabase에서 회비 기록 삭제
    const { error } = await supabase
      .from('fees')
      .delete()
      .eq('id', recordId);

    if (error) {
      throw new Error(`회비 기록 삭제 실패: ${error.message}`);
    }

    // 성공 응답 반환
    return NextResponse.json({
      success: true,
      message: '회비 기록이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('Error deleting fee record:', error);
    return NextResponse.json({ 
      error: '회비 기록 삭제에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 