const { supabase } = require('./lib/supabase');

// 로타리 회기 계산 함수
function getRotaryYear(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 0-based이므로 +1
  
  // 7월 1일 이전이면 이전 회기, 7월 1일 이후면 현재 회기
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
    label: `${startYear}-${endYearShort}회기 (${startYear}년 7월 1일 ~ ${endYear}년 6월 30일)`
  };
}

async function checkAndUpdateRotaryYear() {
  try {
    console.log('🗓️  로타리 회기 시스템 확인 및 업데이트...');
    
    // 1. 현재 날짜 기준 회기 계산
    const today = new Date();
    const currentRotaryYear = getRotaryYear(today);
    const dateRange = getRotaryYearDateRange(currentRotaryYear);
    
    console.log(`📅 현재 날짜: ${today.toISOString().split('T')[0]}`);
    console.log(`🏛️  현재 로타리 회기: ${currentRotaryYear}`);
    console.log(`📊 회기 기간: ${dateRange.label}`);
    
    // 2. 현재 master_info에서 회기 관련 설정 확인
    console.log('\n🔍 master_info 현재 설정 확인...');
    
    const { data: currentSettings, error: fetchError } = await supabase
      .from('master_info')
      .select('*')
      .in('key', ['current_year', 'fee_year', 'rotary_year'])
      .order('key');
    
    if (fetchError) {
      throw fetchError;
    }
    
    console.log('📋 현재 설정:');
    currentSettings.forEach(setting => {
      console.log(`  ${setting.key}: ${setting.value}`);
    });
    
    // 3. 회기 관련 설정 업데이트
    const updates = [
      { key: 'current_year', value: today.getFullYear().toString(), description: '현재 연도' },
      { key: 'fee_year', value: today.getFullYear().toString(), description: '회비 연도' },
      { key: 'rotary_year', value: currentRotaryYear, description: '현재 로타리 회기' },
      { key: 'rotary_year_start', value: dateRange.start, description: '현재 회기 시작일' },
      { key: 'rotary_year_end', value: dateRange.end, description: '현재 회기 종료일' }
    ];
    
    console.log('\n🔄 회기 설정 업데이트...');
    
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
    
    // 4. 업데이트 후 확인
    console.log('\n📊 업데이트 후 설정 확인...');
    
    const { data: updatedSettings, error: verifyError } = await supabase
      .from('master_info')
      .select('*')
      .in('key', ['current_year', 'fee_year', 'rotary_year', 'rotary_year_start', 'rotary_year_end'])
      .order('key');
    
    if (verifyError) {
      throw verifyError;
    }
    
    console.log('📋 업데이트된 설정:');
    updatedSettings.forEach(setting => {
      console.log(`  ${setting.key}: ${setting.value}`);
    });
    
    // 5. 회기별 데이터 개수 확인
    console.log('\n📈 회기별 데이터 현황 분석...');
    
    const currentYearStart = dateRange.start;
    const currentYearEnd = dateRange.end;
    const lastYearStart = `${parseInt(dateRange.start.split('-')[0]) - 1}-07-01`;
    const lastYearEnd = `${parseInt(dateRange.start.split('-')[0])}-06-30`;
    
    // 현재 회기 데이터
    const { count: currentFees } = await supabase
      .from('fees')
      .select('*', { count: 'exact', head: true })
      .gte('date', currentYearStart)
      .lte('date', currentYearEnd);
    
    const { count: currentSpecialFees } = await supabase
      .from('special_fees')
      .select('*', { count: 'exact', head: true })
      .gte('date', currentYearStart)
      .lte('date', currentYearEnd);
    
    const { count: currentServiceFees } = await supabase
      .from('service_fees')
      .select('*', { count: 'exact', head: true })
      .gte('date', currentYearStart)
      .lte('date', currentYearEnd);
    
    // 이전 회기 데이터
    const { count: lastFees } = await supabase
      .from('fees')
      .select('*', { count: 'exact', head: true })
      .gte('date', lastYearStart)
      .lte('date', lastYearEnd);
    
    const { count: lastSpecialFees } = await supabase
      .from('special_fees')
      .select('*', { count: 'exact', head: true })
      .gte('date', lastYearStart)
      .lte('date', lastYearEnd);
    
    const { count: lastServiceFees } = await supabase
      .from('service_fees')
      .select('*', { count: 'exact', head: true })
      .gte('date', lastYearStart)
      .lte('date', lastYearEnd);
    
    console.log(`\n📊 현재 회기 (${currentRotaryYear}) 데이터:`);
    console.log(`  연회비: ${currentFees || 0}건`);
    console.log(`  특별회비: ${currentSpecialFees || 0}건`);
    console.log(`  봉사금: ${currentServiceFees || 0}건`);
    
    console.log(`\n📊 이전 회기 (${parseInt(currentRotaryYear.split('-')[0]) - 1}-${currentRotaryYear.split('-')[0].slice(-2)}) 데이터:`);
    console.log(`  연회비: ${lastFees || 0}건`);
    console.log(`  특별회비: ${lastSpecialFees || 0}건`);
    console.log(`  봉사금: ${lastServiceFees || 0}건`);
    
    // 6. 다음 단계 권장사항
    console.log('\n🎯 다음 단계 권장사항:');
    console.log('1. 회기 선택 UI 구현 (현재/이전 회기 선택)');
    console.log('2. API에 회기 필터링 로직 추가');
    console.log('3. 관리자 페이지에 회기 관리 기능 추가');
    console.log('4. 새 회기 시작 시 회원 회비 리셋 기능 구현');
    
    console.log('\n✅ 로타리 회기 시스템 업데이트 완료!');
    
  } catch (error) {
    console.log('❌ 회기 업데이트 실패:', error.message);
    throw error;
  }
}

checkAndUpdateRotaryYear(); 