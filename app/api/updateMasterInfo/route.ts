import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface UpdateMasterInfoRequest {
  id?: string;
  exchange_rate?: number;
  specialevent_fee?: number;
  special_event_fee?: number; // 실제 key명
  pass?: string;
  sdonation?: number;
  junior_fee?: number;
  emeritus_fee?: number;
  // 필요한 다른 필드들 추가 가능
}

export async function POST(request: NextRequest) {
  try {
    const updateData = await request.json() as UpdateMasterInfoRequest;

    // key-value 구조에 맞게 각 필드를 개별적으로 업데이트
    const updates = [];

    if (updateData.exchange_rate !== undefined) {
      updates.push(updateMasterInfoField('exchange_rate', updateData.exchange_rate.toString()));
    }

    if (updateData.specialevent_fee !== undefined || updateData.special_event_fee !== undefined) {
      const value = updateData.specialevent_fee || updateData.special_event_fee;
      updates.push(updateMasterInfoField('special_event_fee', value!.toString()));
    }

    if (updateData.pass !== undefined) {
      updates.push(updateMasterInfoField('pass', updateData.pass));
    }

    if (updateData.sdonation !== undefined) {
      updates.push(updateMasterInfoField('sdonation', updateData.sdonation.toString()));
    }

    if (updateData.junior_fee !== undefined) {
      updates.push(updateMasterInfoField('junior_fee', updateData.junior_fee.toString()));
    }

    if (updateData.emeritus_fee !== undefined) {
      updates.push(updateMasterInfoField('emeritus_fee', updateData.emeritus_fee.toString()));
    }

    // 모든 업데이트 실행
    await Promise.all(updates);

    return NextResponse.json({ 
      success: true,
      message: '설정이 성공적으로 업데이트되었습니다.',
      updated: updateData
    });
  } catch (error) {
    console.error('Error updating master info:', error);
    return NextResponse.json({ 
      error: '설정 업데이트에 실패했습니다.',
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

// 개별 설정 필드 업데이트 함수
async function updateMasterInfoField(key: string, value: string) {
  const { error } = await supabase
    .from('master_info')
    .update({ value: value })
    .eq('key', key);

  if (error) {
    throw new Error(`${key} 업데이트 실패: ${error.message}`);
  }
} 