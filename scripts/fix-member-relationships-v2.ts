import { supabase } from '../lib/supabase'

// 로그 함수
const log = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`)
}

// Member ID 관계 수정 (개선된 버전)
async function fixMemberRelationshipsV2() {
  log('Member ID 관계 수정 (v2) 시작...')
  
  try {
    // 1. 모든 회원 데이터 조회 (순서대로)
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, name, nickname')
      .order('name')
    
    if (membersError) {
      throw membersError
    }
    
    log(`회원 ${members.length}명 조회됨`)
    
    // 2. 숫자 기반 매핑 시도
    // 일부 회비 데이터의 member_name이 숫자인 경우를 처리
    const memberMap = new Map<string, string>()
    
    // 실제 이름으로 매핑
    members.forEach(member => {
      memberMap.set(member.name, member.id)
      if (member.nickname && member.nickname !== 'null') {
        memberMap.set(member.nickname, member.id)
      }
    })
    
    // 숫자 ID와 회원을 매핑 (추정)
    // 이는 임시적인 해결책입니다. 실제로는 Notion에서 정확한 관계를 가져와야 합니다.
    const numericMapping: { [key: string]: string } = {
      '5': '김철성',
      '6': '권영우', 
      '7': '손병인',
      '8': '신경환',
      '9': '우재현',
      '10': '이재봉',
      '11': '권민혁',
      '12': '김광수',
      '13': '김용구',
      '14': '김진홍',
      '15': '박성호',
      '16': '배종민',
      '17': '신승호',
      '18': '신태영',
      '19': '이상근',
      '20': '이인호',
      '21': '조성진',
      '22': '진숙자'
    }
    
    // 숫자 매핑 추가
    Object.entries(numericMapping).forEach(([num, name]) => {
      const member = members.find(m => m.name === name)
      if (member) {
        memberMap.set(num, member.id)
        log(`숫자 ${num} → ${name} (${member.id})`)
      }
    })
    
    // 3. 회비 데이터 업데이트
    const { data: fees, error: feesError } = await supabase
      .from('fees')
      .select('id, member_name')
      .is('member_id', null)
    
    if (feesError) {
      throw feesError
    }
    
    log(`업데이트할 회비 데이터 ${fees.length}개`)
    
    let updatedCount = 0
    for (const fee of fees) {
      let memberId = memberMap.get(fee.member_name)
      
      // UUID 형태의 member_name 처리 (일부만 사용)
      if (!memberId && fee.member_name.includes('1c47c9ec-930b')) {
        const baseId = fee.member_name.split('_')[0]
        // 이 경우 실제 회원과 매핑하기 어려우므로 스킵
        log(`UUID 형태 member_name 스킵: ${fee.member_name}`)
        continue
      }
      
      if (memberId) {
        const { error } = await supabase
          .from('fees')
          .update({ member_id: memberId })
          .eq('id', fee.id)
        
        if (error) {
          log(`회비 데이터 ${fee.id} 업데이트 실패: ${error.message}`)
        } else {
          updatedCount++
        }
      } else {
        log(`매핑되지 않은 회원: "${fee.member_name}"`)
      }
    }
    
    log(`회비 데이터 ${updatedCount}개 업데이트 완료`)
    
    // 4. 다른 테이블들도 동일하게 처리 (봉사금, 특별회비, 기부금)
    const tables = ['service_fees', 'special_fees', 'donations']
    
    for (const table of tables) {
      const { data: records, error } = await supabase
        .from(table)
        .select('id, member_name')
        .is('member_id', null)
      
      if (error) continue
      
      let tableUpdatedCount = 0
      for (const record of records) {
        const memberId = memberMap.get(record.member_name)
        if (memberId) {
          const { error: updateError } = await supabase
            .from(table)
            .update({ member_id: memberId })
            .eq('id', record.id)
          
          if (!updateError) {
            tableUpdatedCount++
          }
        }
      }
      
      log(`${table} 테이블 ${tableUpdatedCount}개 업데이트 완료`)
    }
    
    log('Member ID 관계 수정 완료!')
  } catch (error) {
    log(`Member ID 관계 수정 실패: ${JSON.stringify(error, null, 2)}`)
    throw error
  }
}

// 스크립트 실행
fixMemberRelationshipsV2()
  .then(() => {
    log('스크립트 실행 완료')
  })
  .catch((error) => {
    log(`스크립트 실행 실패: ${error}`)
  })

export { fixMemberRelationshipsV2 } 