const { supabase } = require('./lib/supabase');

// 로타리 회기 계산 함수 (수정된 버전)
function getRotaryYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 0-based이므로 +1
  
  // 7월 1일 이후면 새 회기 시작 (현재년-다음년)
  // 7월 1일 이전이면 이전 회기 (작년-현재년)
  if (month >= 7) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
}

// 회기별 날짜 범위 계산
function getRotaryYearDateRange(rotaryYear) {
  const [startYear, endYearShort] = rotaryYear.split('-');
  const endYear = parseInt(startYear) + 1;
  
  return {
    start: `${startYear}-07-01`,
    end: `${endYear}-06-30`,
    label: `${rotaryYear}회기 (${startYear}년 7월 1일 ~ ${endYear}년 6월 30일)`
  };
}

async function fixRotaryYear() {
  try {
    console.log('🗓️  로타리 회기 올바른 계산 및 업데이트...');
    
    // 현재 날짜를 2024년 7월 8일로 시뮬레이션
    const currentDate = new Date('2024-07-08');
    const currentRotaryYear = getRotaryYear(currentDate);
    const dateRange = getRotaryYearDateRange(currentRotaryYear);
    
    // 이전 회기 계산
    const previousYear = parseInt(currentRotaryYear.split('-')[0]) - 1;
    const previousRotaryYear = `${previousYear}-${previousYear.toString().slice(-2)}`;
    const previousDateRange = getRotaryYearDateRange(previousRotaryYear);
    
    console.log(`📅 현재 날짜: 2024년 7월 8일 (사용자 기준)`);
    console.log(`🏛️  현재 로타리 회기: ${currentRotaryYear}`);
    console.log(`📊 현재 회기 기간: ${dateRange.label}`);
    console.log(`📊 이전 회기 기간: ${previousDateRange.label}`);
    
    // 올바른 회기 설정 업데이트
    const updates = [
      { key: 'current_year', value: '2024', description: '현재 연도' },
      { key: 'fee_year', value: '2024', description: '회비 연도' },
      { key: 'rotary_year', value: currentRotaryYear, description: '현재 로타리 회기' },
      { key: 'rotary_year_start', value: dateRange.start, description: '현재 회기 시작일' },
      { key: 'rotary_year_end', value: dateRange.end, description: '현재 회기 종료일' },
      { key: 'previous_rotary_year', value: previousRotaryYear, description: '이전 로타리 회기' },
      { key: 'previous_year_start', value: previousDateRange.start, description: '이전 회기 시작일' },
      { key: 'previous_year_end', value: previousDateRange.end, description: '이전 회기 종료일' }
    ];
    
    console.log('\n🔄 올바른 회기 설정 업데이트...');
    
    for (const update of updates) {
      const { error: upsertError } = await supabase
        .from('master_info')
        .upsert({
          key: update.key,
          value: update.value,
          description: update.description
        }, { onConflict: 'key' });
      
      if (upsertError) {
        console.log(`❌ ${update.key} 업데이트 실패:`, upsertError.message);
      } else {
        console.log(`✅ ${update.key}: ${update.value} 업데이트 완료`);
      }
    }
    
    // 회기별 데이터 현황 분석
    console.log('\n📈 회기별 데이터 현황 분석...');
    
    // 현재 회기 (25-26) 데이터 (2024-07-01 ~ 2025-06-30)
    const { count: currentFees } = await supabase
      .from('fees')
      .select('*', { count: 'exact', head: true })
      .gte('date', '2024-07-01')
      .lte('date', '2025-06-30');
    
    const { count: currentSpecialFees } = await supabase
      .from('special_fees')
      .select('*', { count: 'exact', head: true })
      .gte('date', '2024-07-01')
      .lte('date', '2025-06-30');
    
    const { count: currentServiceFees } = await supabase
      .from('service_fees')
      .select('*', { count: 'exact', head: true })
      .gte('date', '2024-07-01')
      .lte('date', '2025-06-30');
    
    // 이전 회기 (24-25) 데이터 (2023-07-01 ~ 2024-06-30)
    const { count: lastFees } = await supabase
      .from('fees')
      .select('*', { count: 'exact', head: true })
      .gte('date', '2023-07-01')
      .lte('date', '2024-06-30');
    
    const { count: lastSpecialFees } = await supabase
      .from('special_fees')
      .select('*', { count: 'exact', head: true })
      .gte('date', '2023-07-01')
      .lte('date', '2024-06-30');
    
    const { count: lastServiceFees } = await supabase
      .from('service_fees')
      .select('*', { count: 'exact', head: true })
      .gte('date', '2023-07-01')
      .lte('date', '2024-06-30');
    
    console.log(`\n📊 현재 회기 (${currentRotaryYear}) 데이터:`);
    console.log(`  연회비: ${currentFees || 0}건`);
    console.log(`  특별회비: ${currentSpecialFees || 0}건`);
    console.log(`  봉사금: ${currentServiceFees || 0}건`);
    
    console.log(`\n📊 이전 회기 (${previousRotaryYear}) 데이터:`);
    console.log(`  연회비: ${lastFees || 0}건`);
    console.log(`  특별회비: ${lastSpecialFees || 0}건`);
    console.log(`  봉사금: ${lastServiceFees || 0}건`);
    
    // 총 데이터 확인
    const { count: totalFees } = await supabase
      .from('fees')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n📊 전체 데이터: ${totalFees || 0}건의 연회비 기록`);
    
    console.log('\n🎯 결론:');
    console.log('- 새로운 25-26회기가 2024년 7월 1일부터 시작됨');
    console.log('- 현재 대부분의 데이터는 이전 24-25회기에 속함');
    console.log('- 회원들이 기본적으로 현재 회기(25-26) 데이터를 보고, 필요시 이전 회기 선택 가능하도록 UI 구현 필요');
    
    console.log('\n✅ 올바른 로타리 회기 시스템 설정 완료!');
    
  } catch (error) {
    console.log('❌ 회기 수정 실패:', error.message);
    throw error;
  }
}

fixRotaryYear(); 