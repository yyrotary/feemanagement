import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // 모든 마스터 정보 조회
    const { data: masterInfoList, error } = await supabase
      .from('master_info')
      .select('key, value');

    if (error) {
      throw new Error(`마스터 정보 조회 실패: ${error.message}`);
    }

    if (!masterInfoList || masterInfoList.length === 0) {
      return NextResponse.json({ error: '마스터 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    // key-value 쌍을 객체로 변환
    const masterInfo: any = {};
    masterInfoList.forEach(item => {
      if (item.key && item.value !== null) {
        // 숫자로 변환할 수 있는 값들
        const numericKeys = ['exchange_rate', 'specialevent_fee', 'special_event_fee', 'sdonation', 'junior_fee', 'emeritus_fee'];
        if (numericKeys.includes(item.key)) {
          masterInfo[item.key] = parseFloat(item.value) || 0;
        } else {
          masterInfo[item.key] = item.value;
        }
      }
    });

    // special_event_fee가 있으면 specialevent_fee로도 설정
    if (masterInfo.special_event_fee) {
      masterInfo.specialevent_fee = masterInfo.special_event_fee;
    }

    // 기본값 설정
    const result = {
      id: 'main',
      exchange_rate: masterInfo.exchange_rate || 0,
      specialevent_fee: masterInfo.specialevent_fee || masterInfo.special_event_fee || 10000,
      pass: masterInfo.pass || '',
      sdonation: masterInfo.sdonation || 0,
      junior_fee: masterInfo.junior_fee || 360000,
      emeritus_fee: masterInfo.emeritus_fee || 200000
    };
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching master info:', error);
    return NextResponse.json({ 
      error: '마스터 정보를 가져오는데 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 