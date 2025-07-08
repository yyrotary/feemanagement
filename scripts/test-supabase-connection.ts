import { supabase } from '../lib/supabase'

// 로그 함수
const log = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`)
}

// Supabase 연결 테스트
async function testSupabaseConnection() {
  log('Supabase 연결 테스트 시작...')
  
  try {
    // 1. 기본 연결 테스트 - members 테이블 조회
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('id, name')
      .limit(1)
    
    if (membersError) {
      log(`Members 테이블 조회 실패: ${JSON.stringify(membersError, null, 2)}`)
    } else {
      log('Members 테이블 조회 성공!')
      log(`회원 정보: ${JSON.stringify(members, null, 2)}`)
    }

    // 2. donations 테이블 조회
    const { data: donations, error: donationsError } = await supabase
      .from('donations')
      .select('id, member_id, amount')
      .limit(1)
    
    if (donationsError) {
      log(`Donations 테이블 조회 실패: ${JSON.stringify(donationsError, null, 2)}`)
    } else {
      log('Donations 테이블 조회 성공!')
      log(`기부 정보: ${JSON.stringify(donations, null, 2)}`)
    }

    // 3. special_fees 테이블 조회
    const { data: specialFees, error: specialFeesError } = await supabase
      .from('special_fees')
      .select('id, member_id, amount')
      .limit(1)
    
    if (specialFeesError) {
      log(`Special_fees 테이블 조회 실패: ${JSON.stringify(specialFeesError, null, 2)}`)
    } else {
      log('Special_fees 테이블 조회 성공!')
      log(`특별회비 정보: ${JSON.stringify(specialFees, null, 2)}`)
    }

  } catch (error) {
    log(`연결 테스트 오류: ${JSON.stringify(error, null, 2)}`)
  }
}

// 스크립트 실행
testSupabaseConnection()
  .then(() => {
    log('테스트 완료')
  })
  .catch((error) => {
    log(`테스트 실패: ${JSON.stringify(error, null, 2)}`)
  })

export { testSupabaseConnection } 