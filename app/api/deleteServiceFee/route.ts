import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { recordId } = await request.json();
    
    console.log('Attempting to delete record:', recordId);

    if (!recordId) {
      return NextResponse.json({ error: '기록 ID는 필수입니다.' }, { status: 400 });
    }

    // Supabase에서 봉사금 기록 삭제
    const { error } = await supabase
      .from('service_fees')
      .delete()
      .eq('id', recordId);

    if (error) {
      throw new Error(`봉사금 기록 삭제 실패: ${error.message}`);
    }

    console.log('Delete successful for record:', recordId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting service fee:', error);
    return NextResponse.json({ 
      error: '봉사금 기록 삭제에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}