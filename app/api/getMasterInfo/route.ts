import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // exchange_rate 정보만 조회
    const { data: masterInfo, error } = await supabase
      .from('master_info')
      .select('value')
      .eq('key', 'exchange_rate')
      .single();

    if (error) {
      throw new Error(`마스터 정보 조회 실패: ${error.message}`);
    }

    if (!masterInfo) {
      return NextResponse.json({ error: '마스터 정보를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    return NextResponse.json({
      exchange_rate: masterInfo.value ? parseInt(masterInfo.value) : 0
    });
  } catch (error) {
    console.error('Error fetching master info:', error);
    return NextResponse.json({ 
      error: '마스터 정보를 가져오는데 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 