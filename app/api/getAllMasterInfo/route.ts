import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // 마스터 정보 조회 (모든 key-value 쌍)
    const { data: masterInfo, error } = await supabase
      .from('master_info')
      .select('*');

    if (error) {
      throw new Error(`마스터 정보 조회 실패: ${error.message}`);
    }

    if (!masterInfo || masterInfo.length === 0) {
      return NextResponse.json({ error: '마스터 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    // key-value 구조를 객체로 변환
    const settings: any = {
      id: masterInfo[0].id // 업데이트를 위해 첫 번째 레코드의 ID 사용
    };

    masterInfo.forEach(item => {
      if (item.key && item.value) {
        // 숫자로 변환 가능한 값들은 숫자로 변환
        if (item.key === 'special_event_fee' || item.key === 'exchange_rate' || item.key === 'sdonation') {
          settings[item.key] = parseInt(item.value) || 0;
        } else {
          settings[item.key] = item.value;
        }
      }
    });

    // 기존 API 호환을 위해 필드명 매핑
    const response = {
      id: settings.id,
      exchange_rate: settings.exchange_rate || 0,
      specialevent_fee: settings.special_event_fee || 20000,
      pass: settings.pass || '',
      sdonation: settings.sdonation || 0,
      // 모든 설정을 포함
      ...settings
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching master info:', error);
    return NextResponse.json({ 
      error: '마스터 정보를 가져오는데 실패했습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 