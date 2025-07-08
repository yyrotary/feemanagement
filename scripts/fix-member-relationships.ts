import { supabase } from '../lib/supabase'

// 로그 함수
const log = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`)
}

// Member ID 관계 수정
async function fixMemberRelationships() {
  log('Member ID 관계 수정 시작...')
  
  try {
    // 1. 모든 회원 데이터 조회
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, name')
    
    if (membersError) {
      throw membersError
    }
    
    log(`회원 ${members.length}명 조회됨`)
    
    // 회원 이름으로 매핑 테이블 생성
    const memberMap = new Map<string, string>()
    members.forEach(member => {
      memberMap.set(member.name, member.id)
    })
    
    // 2. 회비 데이터의 member_id 업데이트
    const { data: fees, error: feesError } = await supabase
      .from('fees')
      .select('id, member_name')
      .is('member_id', null)
    
    if (feesError) {
      throw feesError
    }
    
    log(`업데이트할 회비 데이터 ${fees.length}개`)
    
    for (const fee of fees) {
      const memberId = memberMap.get(fee.member_name)
      if (memberId) {
        const { error } = await supabase
          .from('fees')
          .update({ member_id: memberId })
          .eq('id', fee.id)
        
        if (error) {
          log(`회비 데이터 ${fee.id} 업데이트 실패: ${error.message}`)
        }
      } else {
        log(`회원 이름 '${fee.member_name}'에 해당하는 회원을 찾을 수 없음`)
      }
    }
    
    // 3. 봉사금 데이터의 member_id 업데이트
    const { data: serviceFees, error: serviceFeesError } = await supabase
      .from('service_fees')
      .select('id, member_name')
      .is('member_id', null)
    
    if (serviceFeesError) {
      throw serviceFeesError
    }
    
    log(`업데이트할 봉사금 데이터 ${serviceFees.length}개`)
    
    for (const serviceFee of serviceFees) {
      const memberId = memberMap.get(serviceFee.member_name)
      if (memberId) {
        const { error } = await supabase
          .from('service_fees')
          .update({ member_id: memberId })
          .eq('id', serviceFee.id)
        
        if (error) {
          log(`봉사금 데이터 ${serviceFee.id} 업데이트 실패: ${error.message}`)
        }
      }
    }
    
    // 4. 특별 회비 데이터의 member_id 업데이트
    const { data: specialFees, error: specialFeesError } = await supabase
      .from('special_fees')
      .select('id, member_name')
      .is('member_id', null)
    
    if (specialFeesError) {
      throw specialFeesError
    }
    
    log(`업데이트할 특별 회비 데이터 ${specialFees.length}개`)
    
    for (const specialFee of specialFees) {
      const memberId = memberMap.get(specialFee.member_name)
      if (memberId) {
        const { error } = await supabase
          .from('special_fees')
          .update({ member_id: memberId })
          .eq('id', specialFee.id)
        
        if (error) {
          log(`특별 회비 데이터 ${specialFee.id} 업데이트 실패: ${error.message}`)
        }
      }
    }
    
    // 5. 기부금 데이터의 member_id 업데이트
    const { data: donations, error: donationsError } = await supabase
      .from('donations')
      .select('id, member_name')
      .is('member_id', null)
    
    if (donationsError) {
      throw donationsError
    }
    
    log(`업데이트할 기부금 데이터 ${donations.length}개`)
    
    for (const donation of donations) {
      const memberId = memberMap.get(donation.member_name)
      if (memberId) {
        const { error } = await supabase
          .from('donations')
          .update({ member_id: memberId })
          .eq('id', donation.id)
        
        if (error) {
          log(`기부금 데이터 ${donation.id} 업데이트 실패: ${error.message}`)
        }
      }
    }
    
    log('Member ID 관계 수정 완료!')
  } catch (error) {
    log(`Member ID 관계 수정 실패: ${JSON.stringify(error, null, 2)}`)
    throw error
  }
}

// 스크립트 실행
fixMemberRelationships()
  .then(() => {
    log('스크립트 실행 완료')
  })
  .catch((error) => {
    log(`스크립트 실행 실패: ${error}`)
  })

export { fixMemberRelationships } 