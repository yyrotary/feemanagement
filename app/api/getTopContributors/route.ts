import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('TopContributors API - Fetching from Supabase members table');
    
    // 회원 데이터에서 기여도 점수 기준으로 상위 5명 조회
    const { data: contributors, error } = await supabase
      .from('members')
      .select('id, name, nickname, contribution_score, total_donation')
      .not('contribution_score', 'is', null)
      .gt('contribution_score', 0)
      .order('contribution_score', { ascending: false })
      .limit(5);

    if (error) {
      throw new Error(`상위 기여자 조회 실패: ${error.message}`);
    }

    // 데이터 매핑
    const topContributors = contributors?.map(member => ({
      id: member.id,
      name: member.name || '이름 없음',
      nickname: member.nickname || '',
      totalAmount: member.contribution_score || 0
    })) || [];

    console.log('TopContributors API - Final contributors:', topContributors);
    
    return NextResponse.json({ contributors: topContributors });
  } catch (error) {
    console.error('Error fetching top contributors:', error);
    return NextResponse.json(
      { 
        error: '데이터를 불러오는 중 오류가 발생했습니다.', 
        contributors: [],
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 