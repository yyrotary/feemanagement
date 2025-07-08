import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    // 마스터 정보에서 비밀번호 확인 (key-value 구조)
    const { data: masterInfo, error } = await supabase
      .from('master_info')
      .select('value')
      .eq('key', 'pass')
      .eq('value', password)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`관리자 인증 확인 실패: ${error.message}`);
    }

    if (masterInfo) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
    }

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}